// ============================================================
// Infrastructure: Supabase Client (Server-side)
// 用于 API Routes 和 Server Components
// ============================================================

import { createClient } from '@supabase/supabase-js'

/**
 * 创建服务端 Supabase 客户端（使用 service_role key）
 * 仅在服务端使用（API routes, Server Components）
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// 单例（可选）
let _serverClient: ReturnType<typeof createServerClient> | null = null

export function getServerClient() {
  if (!_serverClient) {
    _serverClient = createServerClient()
  }
  return _serverClient
}
