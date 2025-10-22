-- Update the promoted field to be BOOLEAN with default FALSE
-- This simplifies the field for now; premium promotion types can be added later

-- First, convert existing 'feature' and 'bump' values to TRUE, rest to FALSE
ALTER TABLE listings 
ADD COLUMN promoted_new BOOLEAN DEFAULT FALSE;

UPDATE listings
SET promoted_new = CASE 
  WHEN promoted IN ('feature', 'bump') THEN TRUE
  ELSE FALSE
END;

-- Drop the old column and rename the new one
ALTER TABLE listings DROP COLUMN promoted;
ALTER TABLE listings RENAME COLUMN promoted_new TO promoted;

-- Ensure the column is NOT NULL with the default
ALTER TABLE listings ALTER COLUMN promoted SET NOT NULL;
