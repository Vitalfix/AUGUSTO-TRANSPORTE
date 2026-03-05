-- Create drivers table
create table if not exists drivers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  license_plate text,
  pin text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert a default driver for testing
insert into drivers (name, phone, license_plate, pin) 
values ('Santi Driver', '1122334455', 'AF123GH', '1234')
on conflict do nothing;

-- Add driver_id to orders
alter table orders add column if not exists driver_id uuid references drivers(id);
