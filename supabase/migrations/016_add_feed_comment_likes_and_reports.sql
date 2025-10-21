-- Create feed_comment_likes table for tracking comment likes
CREATE TABLE IF NOT EXISTS feed_comment_likes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES feed_engagement(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Create feed_reports table for reporting posts
CREATE TABLE IF NOT EXISTS feed_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_comment_likes_comment_id ON feed_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comment_likes_user_id ON feed_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_reports_post_id ON feed_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_reports_user_id ON feed_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_reports_status ON feed_reports(status);
