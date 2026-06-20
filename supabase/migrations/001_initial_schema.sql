-- ============================================================
-- learniny-system: Initial Database Schema
-- Supabase PostgreSQL Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users Table
-- ============================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nickname TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  total_sessions INTEGER DEFAULT 0,
  total_discoveries INTEGER DEFAULT 0,
  skill_unlocks TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Learning Sessions Table
-- ============================================================
CREATE TYPE session_status AS ENUM ('started', 'in_progress', 'completed', 'dropped');

CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status session_status DEFAULT 'started',
  theme TEXT,
  round_count INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  discovery_count INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 0,
  current_knowledge_node_id TEXT,
  scaffold_level INTEGER DEFAULT 1,
  question_count_in_round INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Photos Table
-- ============================================================
CREATE TABLE photos (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  upload_order INTEGER NOT NULL,
  note TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Messages Table
-- ============================================================
CREATE TYPE message_role AS ENUM ('user', 'assistant');
CREATE TYPE message_type AS ENUM ('question', 'answer', 'summary', 'task');

CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  message_type message_type NOT NULL,
  content TEXT NOT NULL,
  related_photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
  question_type TEXT,
  round_number INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Practice Tasks Table
-- ============================================================
CREATE TYPE task_status AS ENUM ('pending', 'accepted', 'skipped', 'completed');
CREATE TYPE task_type AS ENUM ('reshoot', 'explore', 'compare', 'free');

CREATE TABLE practice_tasks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  instruction TEXT NOT NULL,
  scaffolding_hints TEXT[] DEFAULT '{}',
  status task_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Discoveries Table
-- ============================================================
CREATE TABLE discoveries (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  source_round INTEGER,
  knowledge_node_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_sessions_status ON learning_sessions(status);
CREATE INDEX idx_photos_session_id ON photos(session_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_tasks_session_id ON practice_tasks(session_id);
CREATE INDEX idx_discoveries_session_id ON discoveries(session_id);
CREATE INDEX idx_discoveries_user_id ON discoveries(user_id);

-- ============================================================
-- Analytics Events Table (for embedded analytics)
-- ============================================================
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES learning_sessions(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);

-- ============================================================
-- Row Level Security (RLS) — basic setup
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public access for MVP (anonymous users)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on sessions" ON learning_sessions FOR ALL USING (true);
CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all on tasks" ON practice_tasks FOR ALL USING (true);
CREATE POLICY "Allow all on discoveries" ON discoveries FOR ALL USING (true);
CREATE POLICY "Allow all on analytics" ON analytics_events FOR ALL USING (true);
