-- Update notifications table to support post_commented and comment_liked types
-- Drop and recreate the type constraint to add new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('message', 'item_sold', 'item_favorited', 'listing_removed', 'verification_needed', 'offer_received', 'offer_accepted', 'offer_declined', 'transaction_complete', 'post_commented', 'comment_liked'));

-- Update target_type constraint to include 'post'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_target_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_target_type_check CHECK (target_type IN ('listing', 'thread', 'user', 'post'));
