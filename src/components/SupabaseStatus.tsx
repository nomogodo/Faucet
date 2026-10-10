import { useEffect, useState } from 'react'
import {
  checkSupabaseConnection,
  isSupabaseConfigured,
  type SupabaseConnectionState,
} from '../lib/supabase'

const statusLabels: Record<SupabaseConnectionState | 'checking', string> = {
  checking: 'SUPABASE · COMPROBANDO',
  connected: 'SUPABASE · CONECTADO',
  'schema-missing': 'SUPABASE · APLICA LA MIGRACIÓN',
  'permission-denied': 'SUPABASE · REVISA RLS',
  error: 'SUPABASE · REVISA URL/CLAVE',
  unconfigured: 'SUPABASE · SIN CONFIGURAR',
}

export default function SupabaseStatus() {
  const [status, setStatus] = useState<SupabaseConnectionState | 'checking'>(
    isSupabaseConfigured ? 'checking' : 'unconfigured',
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let mounted = true
    void checkSupabaseConnection().then((connectionState) => {
      if (mounted) setStatus(connectionState)
    })
    return () => { mounted = false }
  }, [])

  return <span className={`supabase-status supabase-${status}`}><i />{statusLabels[status]}</span>
}