// ============================================================
// Lib: Daily Quota — per-user daily message limit
// 在调用 DeepSeek API 之前检查，调用成功后递增
// ============================================================

import { getServerClient } from '@/lib/db/supabase-server'

/** 每日额度映射：tier → 条数 */
export const DAILY_QUOTA: Record<string, number> = {
  free: 20,
  pro: 200,
}

export interface QuotaResult {
  allowed: boolean
  remaining: number
  limit: number
  currentCount: number
  tier: string
}

/**
 * 检查用户当日额度是否已用尽。
 * - 若用户不存在或 tier 未知，按 free 处理。
 * - 不会在此函数内 +1，调用方需在 API 成功后手动调用 incrementUsage。
 */
export async function checkQuota(userId: string): Promise<QuotaResult> {
  const supabase = getServerClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // 1. 查用户 tier
  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .maybeSingle()

  const tier: string = userData?.tier || 'free'
  const limit = DAILY_QUOTA[tier] ?? DAILY_QUOTA.free

  // 2. 查/upsert 当日用量（不存在则创建，message_count=0）
  const { data: existing } = await supabase
    .from('usage_daily')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  // 如果当日尚无记录，插入一条 message_count=0
  if (!existing) {
    await supabase.from('usage_daily').insert({
      user_id: userId,
      date: today,
      message_count: 0,
    })
  }

  const currentCount = existing?.message_count ?? 0
  const allowed = currentCount < limit

  return {
    allowed,
    remaining: Math.max(0, limit - currentCount),
    limit,
    currentCount,
    tier,
  }
}

/**
 * 成功调用 DeepSeek API 后，将用户当日 message_count +1。
 * 使用 upsert 确保幂等（同一天不存在则 insert 1）。
 */
export async function incrementUsage(userId: string): Promise<void> {
  const supabase = getServerClient()
  const today = new Date().toISOString().split('T')[0]

  // 使用 RPC 或 raw SQL 做原子递增，避免 race condition
  // Supabase JS client 不直接支持 ON CONFLICT ... DO UPDATE SET count = count + 1，
  // 我们用两步：先查再 upsert。对 MVP 场景足够。
  const { data: existing } = await supabase
    .from('usage_daily')
    .select('id, message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('usage_daily')
      .update({ message_count: existing.message_count + 1 })
      .eq('id', existing.id)
  } else {
    await supabase.from('usage_daily').insert({
      user_id: userId,
      date: today,
      message_count: 1,
    })
  }
}
