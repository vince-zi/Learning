-- ============================================================
-- learniny-system: English Module Migration
-- 英语学习模块 — 新增表和字段
-- ============================================================

-- ============================================================
-- 1. 给 learning_sessions 增加 module 字段
-- ============================================================
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'photography';
CREATE INDEX IF NOT EXISTS idx_sessions_module ON learning_sessions(module);

-- ============================================================
-- 2. 英语学习者档案表
-- ============================================================
CREATE TABLE IF NOT EXISTS english_learner_profiles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cefr_level VARCHAR(4) DEFAULT 'A1',          -- 'A1','A2','B1','B2','C1','C2'
  known_vocabulary_size INTEGER DEFAULT 0,
  strengths TEXT[] DEFAULT '{}',               -- ['vocabulary','fluency','grammar']
  weaknesses TEXT[] DEFAULT '{}',              -- ['grammar-tenses','prepositions']
  sentences_produced INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  error_patterns JSONB DEFAULT '[]',           -- [{type, frequency, examples, description}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_english_profile_user_id ON english_learner_profiles(user_id);

-- ============================================================
-- 3. 英语纠错记录表（建立长期壁垒）
-- ============================================================
CREATE TABLE IF NOT EXISTS error_records (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES learning_sessions(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,                 -- 用户原文
  corrected_text TEXT,                         -- 纠正后的表达
  error_type VARCHAR(50) NOT NULL,             -- 'grammar-tense','vocabulary-choice', etc.
  error_pattern VARCHAR(100),                  -- 具体错误模式，如 'missing-article', 'wrong-tense'
  severity VARCHAR(20) DEFAULT 'minor',        -- 'minor','moderate','major'
  noted_by_user BOOLEAN DEFAULT false,         -- 用户是否注意到了此错误
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_records_user_id ON error_records(user_id);
CREATE INDEX IF NOT EXISTS idx_error_records_session_id ON error_records(session_id);
CREATE INDEX IF NOT EXISTS idx_error_records_error_type ON error_records(error_type);
CREATE INDEX IF NOT EXISTS idx_error_records_user_error ON error_records(user_id, error_type);

-- ============================================================
-- 4. 用户统计表扩展：添加英语相关字段
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS english_session_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS english_discovery_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS english_skill_unlocks TEXT[] DEFAULT '{}';

-- ============================================================
-- 5. 给已有数据打补丁：回填 module 字段
-- ============================================================
UPDATE learning_sessions SET module = 'photography' WHERE module IS NULL;

-- ============================================================
-- 6. RLS 策略
-- ============================================================
ALTER TABLE english_learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on english_learner_profiles" ON english_learner_profiles FOR ALL USING (true);
CREATE POLICY "Allow all on error_records" ON error_records FOR ALL USING (true);
