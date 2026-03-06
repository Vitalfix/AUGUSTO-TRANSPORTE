-- Add special pricing columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS has_special_pricing BOOLEAN DEFAULT FALSE;
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS special_prices JSONB DEFAULT '{}';
-- Final verification of current schema for orders if needed
-- (The user mentioned 'distance_km' and 'travel_hours' were missing in some cases)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS travel_hours NUMERIC;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS observations TEXT;