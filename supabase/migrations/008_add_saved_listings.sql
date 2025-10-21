-- Create saved_listings table
CREATE TABLE IF NOT EXISTS saved_listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Create index for faster lookups
CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);
