-- Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'item_sold', 'item_favorited', 'listing_removed', 'verification_needed', 'offer_received', 'offer_accepted', 'offer_declined', 'transaction_complete', 'post_commented', 'comment_liked')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_id TEXT, -- listing_id, thread_id, user_id, or post_id depending on type
  target_type TEXT CHECK (target_type IN ('listing', 'thread', 'user', 'post')),
  data JSONB DEFAULT '{}', -- Additional context data
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
