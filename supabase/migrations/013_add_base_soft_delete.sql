-- Add deleted_at column to bases table for soft deletes
ALTER TABLE bases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Create index for deleted_at to improve query performance
CREATE INDEX IF NOT EXISTS idx_bases_deleted_at ON bases(deleted_at);

-- Create index for active bases (where deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_bases_active ON bases(deleted_at) WHERE deleted_at IS NULL;
