-- Update messages type constraint to include 'offer' for offer messages
ALTER TABLE messages DROP CONSTRAINT messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'attachment', 'offer'));
