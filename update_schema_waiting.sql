-- Add waiting time field to orders
alter table orders 
add column if not exists waiting_minutes integer default 0;
