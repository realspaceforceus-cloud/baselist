-- Add allow_tagging column to users table (default: true)
ALTER TABLE users ADD COLUMN allow_tagging BOOLEAN DEFAULT true;

-- Update notifications type constraint to include tagging types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('message', 'item_sold', 'item_favorited', 'listing_removed', 'verification_needed', 'offer_received', 'offer_accepted', 'offer_declined', 'transaction_complete', 'post_commented', 'comment_liked', 'comment_replied', 'tagged_in_post', 'tagged_in_comment'));

-- Create table to track user interactions for smart filtering
CREATE TABLE IF NOT EXISTS user_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interacted_with_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('commented', 'replied', 'liked')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient smart filtering queries
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_interacted_with ON user_interactions(interacted_with_id);
