-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  background_color TEXT DEFAULT '#dbeafe',
  text_color TEXT DEFAULT '#1e40af',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- Create table to track dismissed announcements per user
CREATE TABLE IF NOT EXISTS dismissed_announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, announcement_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_announcements_visible ON announcements(is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dismissed_announcements_user_id ON dismissed_announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_announcements_announcement_id ON dismissed_announcements(announcement_id);
