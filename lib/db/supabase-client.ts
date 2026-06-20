// ============================================================
// Infrastructure: Supabase Client (Browser)
// Lazy initialization for environments without Supabase configured
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _warned = false

function getClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'no-key-configured'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !_warned) {
    _warned = true
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL not set. Running without DB persistence.')
  }

  _client = createClient(url, key)
  return _client
}

// Export a lazy proxy — only creates client on first property access
export const supabase = new Proxy({} as unknown as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const val = Reflect.get(client, prop, client)
    if (typeof val === 'function') {
      return val.bind(client)
    }
    return val
  },
})

export type { User, Session } from '@supabase/supabase-js'
