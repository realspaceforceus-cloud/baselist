-- Create store_items table for user-owned stores
CREATE TABLE store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_store_items_user_id ON store_items(user_id);
CREATE INDEX idx_store_items_created_at ON store_items(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Store items are publicly readable" ON store_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own store items" ON store_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store items" ON store_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store items" ON store_items
  FOR DELETE USING (auth.uid() = user_id);
