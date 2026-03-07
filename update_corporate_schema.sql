-- Migración: Soporte para Clientes Corporativos y Localizaciones Privadas
-- 1. Agregar columnas a la tabla de clientes
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false;
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS client_slug TEXT UNIQUE;
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- 2. Agregar columna a la tabla de localizaciones para vincularlas a un cliente específico
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
-- 3. Crear índice para búsquedas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_customers_slug ON customers(client_slug);
-- 4. Marcar a SIEMENS como corporativo si existe
UPDATE customers
SET is_corporate = true,
    client_slug = 'siemens',
    logo_url = '/logos/siemens.png'
WHERE name ILIKE '%SIEMENS%';