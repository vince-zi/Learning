-- ============================================================
-- Migration: user_feedback table
-- Stores user suggestions submitted from the Profile page
-- ============================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  page TEXT DEFAULT 'profile',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow anonymous inserts (anon key users can submit feedback)
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert feedback" ON user_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can read all feedback" ON user_feedback FOR SELECT USING (true);
