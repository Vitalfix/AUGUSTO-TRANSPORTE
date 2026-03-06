create table if not exists recycle_bin (
  id uuid primary key default gen_random_uuid(),
  original_id text not null,
  table_name text not null,
  data jsonb not null,
  deleted_at timestamp with time zone default now()
);
alter table recycle_bin enable row level security;
create policy "Enable all for authenticated" on recycle_bin for all using (true);
