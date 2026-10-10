const MAX_BODY_BYTES = 16_384
const MAX_AGE_SECONDS = 300
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SECRET_PATTERN = /^[0-9a-f]{64}$/i

type CompletionPayload = {
  provider: string
  external_transaction_id: string
  user_id: string
  points: number
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function isCompletionPayload(value: unknown): value is CompletionPayload {
  if (typeof value !== 'object' || value === null) return false
  const payload = value as Record<string, unknown>
  return typeof payload.provider === 'string'
    && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(payload.provider)
    && typeof payload.external_transaction_id === 'string'
    && payload.external_transaction_id.length >= 1
    && payload.external_transaction_id.length <= 128
    && typeof payload.user_id === 'string'
    && UUID_PATTERN.test(payload.user_id)
    && Number.isInteger(payload.points)
    && typeof payload.points === 'number'
    && payload.points >= 1
    && payload.points <= 100_000
}

function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

async function readRequestBody(request: Request): Promise<string | null> {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

async function verifySignature(secret: string, timestamp: string, body: string, signature: string) {
  if (!SECRET_PATTERN.test(secret) || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    hexToBytes(signature),
    new TextEncoder().encode(`${timestamp}.${body}`),
  )
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('OFFERWALL_WEBHOOK_SECRET')
  const expectedProvider = Deno.env.get('OFFERWALL_PROVIDER_ID')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !expectedProvider || !/^[a-z0-9][a-z0-9_-]{0,39}$/.test(expectedProvider)
    || !supabaseUrl || !serviceRoleKey || !SECRET_PATTERN.test(secret)) {
    return jsonResponse({ error: 'Webhook is not configured' }, 500)
  }

  const timestamp = request.headers.get('x-faucet-timestamp') ?? ''
  const signature = request.headers.get('x-faucet-signature') ?? ''
  if (!/^\d{10}$/.test(timestamp)) {
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  const timestampSeconds = Number(timestamp)
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_AGE_SECONDS) {
    return jsonResponse({ error: 'Expired signature' }, 401)
  }

  const body = await readRequestBody(request)
  if (body === null) {
    return jsonResponse({ error: 'Request body too large' }, 413)
  }

  let signatureIsValid = false
  try {
    signatureIsValid = await verifySignature(secret, timestamp, body, signature)
  } catch {
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }
  if (!signatureIsValid) {
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!isCompletionPayload(payload) || payload.provider !== expectedProvider) {
    return jsonResponse({ error: 'Invalid completion payload' }, 400)
  }

  let databaseResponse: Response
  try {
    databaseResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/credit_offerwall_completion`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        p_provider: payload.provider,
        p_external_transaction_id: payload.external_transaction_id,
        p_user_id: payload.user_id,
        p_points: payload.points,
      }),
    })
  } catch {
    return jsonResponse({ error: 'Reward processing unavailable' }, 502)
  }

  if (!databaseResponse.ok) {
    return jsonResponse({ error: 'Reward processing failed' }, 502)
  }

  let result: unknown
  try {
    result = await databaseResponse.json()
  } catch {
    return jsonResponse({ error: 'Unexpected reward response' }, 502)
  }
  if (!Array.isArray(result) || typeof result[0]?.credited !== 'boolean') {
    return jsonResponse({ error: 'Unexpected reward response' }, 502)
  }

  return jsonResponse({ accepted: true }, 200)
})
