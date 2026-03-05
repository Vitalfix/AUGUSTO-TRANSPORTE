-- Create the new pricing table for storing dynamic pricing values
create table if not exists pricing_config (
  id text primary key, -- 'utilitario_chico', 'camioneta_mediana', etc.
  name text not null,
  description text,
  price_km numeric default 0,
  price_hour numeric default 0,
  price_wait_hour numeric default 0,
  price_stay numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert initial rows so the admin can edit them later
insert into pricing_config (id, name, description, price_km, price_hour, price_wait_hour, price_stay)
values 
  ('utilitario_chico', 'Utilitario Chico', 'Hasta 500kg o medio palé', 500, 10000, 5000, 20000),
  ('camioneta_mediana', 'Camioneta Mediana', 'Hasta 900kg o 2 palés', 700, 12000, 6000, 25000),
  ('camioneta_grande', 'Camioneta Grande', 'Hasta 1200kg o 3 palés', 900, 15000, 7500, 30000),
  ('camion_chico', 'Camión Chico', 'Hasta 3500kg o 6 palés', 1500, 25000, 12500, 50000),
  ('camion_mediano', 'Camión Mediano', 'Hasta 8000kg o 12 palés', 2500, 40000, 20000, 75000),
  ('semi', 'Semi Remolque', 'Hasta 28000kg o 28 palés', 4000, 60000, 30000, 100000)
on conflict (id) do nothing;

-- Create settings table for password management
create table if not exists site_settings (
  id text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Default master password
insert into site_settings (id, value)
values ('master_password', 'vitalfix')
on conflict (id) do nothing;
