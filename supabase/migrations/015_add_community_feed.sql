-- Create feed_posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_id TEXT NOT NULL REFERENCES bases(id),
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'photo', 'poll', 'event', 'psa')),
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  poll_options JSONB,
  poll_votes JSONB DEFAULT '{}',
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create feed_announcements table
CREATE TABLE IF NOT EXISTS feed_announcements (
  id TEXT PRIMARY KEY,
  base_id TEXT NOT NULL REFERENCES bases(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_sticky BOOLEAN DEFAULT FALSE,
  is_dismissible BOOLEAN DEFAULT TRUE,
  dismissed_by TEXT[] DEFAULT '{}',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create feed_engagement table for likes and comments
CREATE TABLE IF NOT EXISTS feed_engagement (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engagement_type TEXT NOT NULL CHECK (engagement_type IN ('like', 'comment')),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(post_id, user_id, engagement_type) WHERE deleted_at IS NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_base_id ON feed_posts(base_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_deleted_at ON feed_posts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_feed_announcements_base_id ON feed_announcements(base_id);
CREATE INDEX IF NOT EXISTS idx_feed_announcements_sticky ON feed_announcements(is_sticky);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_post_id ON feed_engagement(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_user_id ON feed_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_type ON feed_engagement(engagement_type);
