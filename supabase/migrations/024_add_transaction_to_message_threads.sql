-- Add transaction field to message_threads to store offer data, status, and completion info
ALTER TABLE message_threads
ADD COLUMN transaction JSONB DEFAULT NULL;

-- Add index for efficient transaction queries
CREATE INDEX IF NOT EXISTS idx_message_threads_transaction ON message_threads USING GIN (transaction);

-- Add comment for documentation
COMMENT ON COLUMN message_threads.transaction IS 'Stores transaction data including offer (amount, madeBy, madeAt, status), lastReadAt per user, and completion info (markedCompleteBy, completedAt, status, ratingByUser)';
