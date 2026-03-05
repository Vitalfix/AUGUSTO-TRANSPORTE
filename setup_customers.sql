-- Create customers table
create table if not exists customers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text,
    phone text,
    cuit text,
    tax_status text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(name, phone) -- Simple unique constraint to avoid duplicates
);
-- Index for searching
create index if not exists customers_name_idx on customers (name);