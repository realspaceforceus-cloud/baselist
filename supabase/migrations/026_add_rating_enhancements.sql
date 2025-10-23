-- Add missing columns to ratings table for transaction ratings with target users
ALTER TABLE ratings
ADD COLUMN IF NOT EXISTS target_user_id TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rating_type TEXT DEFAULT 'transaction' CHECK (rating_type IN ('transaction', 'seller', 'buyer'));

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ratings_target_user_id ON ratings(target_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating_type ON ratings(rating_type);
