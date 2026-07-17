-- ============================================================
-- 007_learning_context_kv.sql
-- Add learning_context_kv JSONB column to english_learner_profiles
-- ============================================================
ALTER TABLE english_learner_profiles ADD COLUMN IF NOT EXISTS learning_context_kv JSONB DEFAULT '{}';
