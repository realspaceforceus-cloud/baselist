-- Add store fields to users table
ALTER TABLE users ADD COLUMN store_name VARCHAR(255);
ALTER TABLE users ADD COLUMN store_slug VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN store_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN store_background_color VARCHAR(7) DEFAULT '#FFFFFF';
ALTER TABLE users ADD COLUMN store_text_color VARCHAR(7) DEFAULT '#000000';
ALTER TABLE users ADD COLUMN store_logo_url VARCHAR(500);

-- Create index on store_slug for fast lookups
CREATE INDEX idx_users_store_slug ON users(store_slug) WHERE store_enabled = true;
