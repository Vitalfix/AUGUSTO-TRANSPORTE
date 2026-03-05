-- Tabla de pedidos completa
create table if not exists orders (
  id text primary key,
  customer_name text not null,
  vehicle text not null,
  origin text,
  destination text not null,
  price numeric not null,
  status text not null default 'PENDING',
  created_at timestamp with time zone default now(),
  travel_date text,
  travel_time text,
  cuit text,
  customer_email text,
  customer_phone text,
  lat numeric,
  lng numeric,
  origin_lat numeric,
  origin_lng numeric,
  dest_lat numeric,
  dest_lng numeric,
  driver_name text,
  driver_phone text,
  license_plate text,
  driver_id text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  waiting_minutes integer,
  activity_log jsonb default '[]'::jsonb
);
-- Habilitar RLS (Seguridad a nivel de fila)
alter table orders enable row level security;
-- Políticas de acceso
create policy "Enable access to all users for select" on orders for
select using (true);
create policy "Enable insert for all users" on orders for
insert with check (true);
create policy "Enable update for all users" on orders for
update using (true);