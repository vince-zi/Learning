-- ============================================================
-- Migration 003: Add explanation & review_scenario to error_records
-- ============================================================
-- The chat route already writes these fields, but the schema was
-- missing the columns. Supabase silently dropped the data.
-- ============================================================

ALTER TABLE error_records ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE error_records ADD COLUMN IF NOT EXISTS review_scenario TEXT;
