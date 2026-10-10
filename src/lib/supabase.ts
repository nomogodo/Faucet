import { createClient } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '')
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(projectUrl && publicKey)

export const supabase = isSupabaseConfigured && projectUrl && publicKey
  ? createClient(projectUrl, publicKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
  : null

export type SupabaseConnectionState =
  | 'unconfigured'
  | 'connected'
  | 'schema-missing'
  | 'permission-denied'
  | 'error'

export async function checkSupabaseConnection(): Promise<SupabaseConnectionState> {
  if (!supabase) return 'unconfigured'

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (!error) return 'connected'
    if (error.code === 'PGRST205' || error.code === '42P01') return 'schema-missing'
    if (error.code === '42501') return 'permission-denied'
    return 'error'
  } catch {
    return 'error'
  }
}