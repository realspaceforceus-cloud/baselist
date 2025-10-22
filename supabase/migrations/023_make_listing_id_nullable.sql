-- Allow listing_id to be nullable for direct messages (DMs)
ALTER TABLE message_threads
ALTER COLUMN listing_id DROP NOT NULL;
