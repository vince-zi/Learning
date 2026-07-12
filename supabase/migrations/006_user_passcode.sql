-- ============================================================
-- Migration: Add passcode column to users table for sync
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode TEXT;
