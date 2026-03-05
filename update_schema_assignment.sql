-- Add driver assignment fields to orders table
alter table orders 
add column if not exists driver_name text,
add column if not exists driver_phone text,
add column if not exists license_plate text;
