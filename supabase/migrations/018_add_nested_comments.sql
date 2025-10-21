-- Add parent_id column to feed_engagement table to support nested comments (replies)
ALTER TABLE feed_engagement ADD COLUMN parent_id TEXT REFERENCES feed_engagement(id) ON DELETE CASCADE;

-- Create index on parent_id for efficient querying of replies
CREATE INDEX IF NOT EXISTS idx_feed_engagement_parent_id ON feed_engagement(parent_id) WHERE parent_id IS NOT NULL;

-- Create index on post_id and parent_id together for efficient fetching of nested comments
CREATE INDEX IF NOT EXISTS idx_feed_engagement_post_parent ON feed_engagement(post_id, parent_id) WHERE engagement_type = 'comment';
