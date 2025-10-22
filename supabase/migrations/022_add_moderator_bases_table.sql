-- Create moderator_bases table for assigning multiple bases to moderators
CREATE TABLE moderator_bases (
  id TEXT PRIMARY KEY,
  moderator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_id TEXT NOT NULL REFERENCES bases(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(moderator_id, base_id)
);

-- Create index for efficient lookups
CREATE INDEX idx_moderator_bases_moderator_id ON moderator_bases(moderator_id);
CREATE INDEX idx_moderator_bases_base_id ON moderator_bases(base_id);

-- Migrate existing moderator baseIds from users table to moderator_bases
INSERT INTO moderator_bases (id, moderator_id, base_id, assigned_at)
SELECT 
  (SELECT uuid_generate_v4())::TEXT,
  id,
  base_id,
  created_at
FROM users
WHERE role = 'moderator' AND base_id IS NOT NULL
ON CONFLICT (moderator_id, base_id) DO NOTHING;

-- Clear baseId for admins (they have access to all bases)
UPDATE users
SET base_id = NULL
WHERE role = 'admin';
