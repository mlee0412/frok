-- 0002_ha.sql
-- Home Assistant registries and snapshots for monitoring

create table if not exists public.ha_areas (
  area_id text primary key,
  name text
);

create table if not exists public.ha_devices (
  device_id text primary key,
  name text,
  manufacturer text,
  model text,
  area_id text references public.ha_areas(area_id)
);

create table if not exists public.ha_entities (
  entity_id text primary key,
  device_id text references public.ha_devices(device_id),
  area_id text references public.ha_areas(area_id),
  domain text,
  name text,
  disabled_by text
);

create table if not exists public.ha_entity_snapshots (
  id uuid primary key default gen_random_uuid(),
  entity_id text references public.ha_entities(entity_id),
  state text,
  attrs jsonb,
  taken_at timestamptz not null default now()
);

create index if not exists ha_entity_snapshots_entity_time_idx on public.ha_entity_snapshots(entity_id, taken_at desc);

alter table public.ha_areas enable row level security;
alter table public.ha_devices enable row level security;
alter table public.ha_entities enable row level security;
alter table public.ha_entity_snapshots enable row level security;

-- read-only anon for dashboard
drop policy if exists ha_areas_select_anon on public.ha_areas;
create policy ha_areas_select_anon on public.ha_areas for select to anon using (true);

drop policy if exists ha_devices_select_anon on public.ha_devices;
create policy ha_devices_select_anon on public.ha_devices for select to anon using (true);

drop policy if exists ha_entities_select_anon on public.ha_entities;
create policy ha_entities_select_anon on public.ha_entities for select to anon using (true);

drop policy if exists ha_entity_snapshots_select_anon on public.ha_entity_snapshots;
create policy ha_entity_snapshots_select_anon on public.ha_entity_snapshots for select to anon using (true);
