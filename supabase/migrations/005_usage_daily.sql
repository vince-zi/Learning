-- ============================================================
-- learniny-system: Daily Usage Quota Migration
-- 每日消息额度限制 — usage_daily 表 + users.tier 字段
-- ============================================================

-- ============================================================
-- 1. 给 users 表增加 tier 字段（免费/付费）
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
-- 约束：只允许 'free' 或 'pro'
ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('free', 'pro'));

-- ============================================================
-- 2. 每日用量表
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_daily (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0
);

-- 复合唯一约束：同一用户同一天只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user_id ON usage_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON usage_daily(date);

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on usage_daily" ON usage_daily FOR ALL USING (true);
