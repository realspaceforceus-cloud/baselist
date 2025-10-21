-- Add vehicle-specific fields to listings table for Vehicles category
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_year TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_miles TEXT;

-- Create index on vehicle fields for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_vehicle_make ON listings(vehicle_make);
CREATE INDEX IF NOT EXISTS idx_listings_vehicle_type ON listings(vehicle_type);
