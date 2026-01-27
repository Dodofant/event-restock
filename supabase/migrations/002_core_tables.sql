-- 002_core_tables.sql
-- Tabellen: events, settings, locations, items, location_items, runners, orders, order_lines

begin;

-- EVENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status event_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SETTINGS (Single Row: active_event_id)
create table if not exists public.app_settings (
  id int primary key default 1,
  active_event_id uuid null references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

-- LOCATIONS (pro Event)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,

  public_id text not null,
  name text not null,
  type location_type not null default 'bar',
  active boolean not null default true,

  -- optional: PIN (serverseitig als Hash speichern)
  pin_hash text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint locations_public_id_unique unique (public_id)
);

-- ITEMS (pro Event)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,

  name text not null,
  category item_category not null default 'drink',
  subcategory item_subcategory not null default 'sonstiges_getraenk',
  default_unit item_unit not null default 'stk',
  pack_size int null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint items_pack_size_positive check (pack_size is null or pack_size > 0)
);

-- LOCATION_ITEMS (Zuweisungen pro Location)
create table if not exists public.location_items (
  event_id uuid not null references public.events(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,

  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),

  primary key (location_id, item_id)
);

-- RUNNERS (pro Event)
create table if not exists public.runners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,

  name text not null,
  pin_hash text not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ORDERS (minimal, damit order_lines existieren kann)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,

  created_at timestamptz not null default now()
);

-- ORDER_LINES (wichtig: dein Delete-Check referenziert diese Tabelle)
create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,

  qty int not null,
  created_at timestamptz not null default now(),

  constraint order_lines_qty_positive check (qty > 0)
);

alter table public.orders
add column if not exists status text not null default 'open';

create index if not exists orders_status_idx
on public.orders (status);

commit;