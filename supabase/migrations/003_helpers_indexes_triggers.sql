-- 003_helpers_indexes_triggers.sql
-- Helper Funktionen, Indizes, updated_at Trigger, Settings-Row initialisieren

begin;

-- updated_at Trigger Funktion
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers (idempotent)
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_events_updated_at') then
    create trigger trg_events_updated_at
    before update on public.events
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_app_settings_updated_at') then
    create trigger trg_app_settings_updated_at
    before update on public.app_settings
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_locations_updated_at') then
    create trigger trg_locations_updated_at
    before update on public.locations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_items_updated_at') then
    create trigger trg_items_updated_at
    before update on public.items
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_runners_updated_at') then
    create trigger trg_runners_updated_at
    before update on public.runners
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Public ID Generator (kurz, URL-friendly)
create or replace function public.make_public_id(len int default 10)
returns text
language plpgsql
as $$
declare
  raw bytea;
  txt text;
begin
  raw := gen_random_bytes(32);
  txt := translate(encode(raw, 'base64'), E'+/=\n\r', '');
  return lower(substr(txt, 1, len));
end;
$$;

-- Default public_id für Locations (falls du beim Insert keines setzt)
alter table public.locations
  alter column public_id set default public.make_public_id(10);

-- Singleton Row für app_settings sicherstellen
insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

-- Indizes
create index if not exists idx_locations_event_id on public.locations(event_id);
create index if not exists idx_items_event_id on public.items(event_id);
create index if not exists idx_location_items_event_id on public.location_items(event_id);
create index if not exists idx_location_items_location_id on public.location_items(location_id);
create index if not exists idx_location_items_item_id on public.location_items(item_id);
create index if not exists idx_runners_event_id on public.runners(event_id);
create index if not exists idx_orders_event_id on public.orders(event_id);
create index if not exists idx_orders_location_id on public.orders(location_id);
create index if not exists idx_order_lines_order_id on public.order_lines(order_id);
create index if not exists idx_order_lines_item_id on public.order_lines(item_id);

commit;