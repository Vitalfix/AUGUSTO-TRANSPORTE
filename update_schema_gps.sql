-- Agregar columnas de ubicación a la tabla orders
alter table orders add column if not exists lat numeric;
alter table orders add column if not exists lng numeric;
