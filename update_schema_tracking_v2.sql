-- Mejoras para el Seguimiento de Viajes
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS origin_lat numeric;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS origin_lng numeric;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS dest_lat numeric;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS dest_lng numeric;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS activity_log jsonb DEFAULT '[]'::jsonb;
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stops jsonb DEFAULT '[]'::jsonb;