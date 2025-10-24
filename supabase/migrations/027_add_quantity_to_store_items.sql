-- Add quantity column to store_items table
ALTER TABLE store_items ADD COLUMN quantity INTEGER DEFAULT 1;
