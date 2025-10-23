-- Add thread_id to ratings table for cases where transactions don't have separate records
ALTER TABLE ratings ADD COLUMN thread_id TEXT REFERENCES message_threads(id) ON DELETE CASCADE;

-- Make transaction_id nullable since we're using thread_id as an alternative
ALTER TABLE ratings ALTER COLUMN transaction_id DROP NOT NULL;

-- Create an index on thread_id for faster lookups
CREATE INDEX idx_ratings_thread_id ON ratings(thread_id);

-- Add constraint to ensure at least one of transaction_id or thread_id is provided
ALTER TABLE ratings ADD CONSTRAINT ratings_transaction_or_thread CHECK (transaction_id IS NOT NULL OR thread_id IS NOT NULL);
