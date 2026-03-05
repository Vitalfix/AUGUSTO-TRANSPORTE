-- Actualización de esquema para V2
alter table orders add column if not exists travel_date text;
alter table orders add column if not exists travel_time text;
alter table orders add column if not exists origin text;
alter table orders add column if not exists cuit text;
