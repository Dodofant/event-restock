-- 006_seed_dev_data.sql
-- Seed fuer DEV/Test (Event, Settings, Locations, Items, Zuweisung, Runner)
-- Voraussetzung: pgcrypto extension ist aktiv (kommt aus 001)
-- crypt()/gen_salt('bf') liefert bcrypt-Hashes.

begin;

-- 1) Event erstellen (oder wiederverwenden)
do $$
declare
  ev_id uuid;
begin
  select id into ev_id from public.events where name = 'Test Event' limit 1;

  if ev_id is null then
    insert into public.events (name, status)
    values ('Test Event', 'active')
    returning id into ev_id;
  end if;

  -- 2) Active Event setzen
  insert into public.app_settings (id, active_event_id)
  values (1, ev_id)
  on conflict (id) do update set active_event_id = excluded.active_event_id;

  -- 3) Locations (Beispiele)
  -- PIN Hash: Beispiel PIN "1234" (bitte nach Wunsch anpassen)
  insert into public.locations (event_id, public_id, name, type, active, pin_hash)
  values
    (ev_id, 'bar-01', 'Bar Hauptstand', 'bar', true, crypt('1234', gen_salt('bf'))),
    (ev_id, 'food-01', 'Food Stand', 'food', true, crypt('1234', gen_salt('bf')))
  on conflict (public_id) do nothing;

  -- 4) Items (Beispiele)
  -- Tipp: pack_size nur sinnvoll wenn default_unit=gebinde, aber ist nicht zwingend.
  insert into public.items (event_id, name, category, subcategory, default_unit, pack_size, active)
  values
    (ev_id, 'Bier Dose 5 dl', 'drink', 'bier', 'stk', null, true),
    (ev_id, 'Mineral Wasser 5 dl', 'drink', 'wasser', 'stk', null, true),
    (ev_id, 'Cola 5 dl', 'drink', 'softdrink', 'stk', null, true),
    (ev_id, 'Rotwein Flasche', 'drink', 'wein', 'stk', null, true),
    (ev_id, 'Kaffee', 'drink', 'kaffee_tee', 'stk', null, true),

    (ev_id, 'Bratwurst', 'food', 'fleisch', 'stk', null, true),
    (ev_id, 'Pommes', 'food', 'beilage', 'stk', null, true),
    (ev_id, 'Chicken Nuggets', 'food', 'beilage', 'stk', null, true),
    (ev_id, 'Burger Bun', 'food', 'brot_buns', 'stk', null, true),
    (ev_id, 'Ketchup', 'food', 'sauce_dressing', 'stk', null, true),

    (ev_id, 'Becher 3 dl', 'other', 'einweg', 'gebinde', 50, true),
    (ev_id, 'Gabeln', 'other', 'einweg', 'gebinde', 100, true),
    (ev_id, 'Gasflasche', 'other', 'gas', 'stk', null, true)
  on conflict do nothing;

  -- 5) Zuweisungen (location_items)
  -- Wir weisen ein paar Items der Bar und ein paar dem Food-Stand zu.
  -- Sort: 10er Schritte, damit du spaeter sauber umsortieren kannst.
  insert into public.location_items (event_id, location_id, item_id, active, sort)
  select
    ev_id,
    l.id as location_id,
    i.id as item_id,
    true,
    x.sort
  from (
    values
      -- Bar Hauptstand
      ('bar-01','Bier Dose 5 dl', 10),
      ('bar-01','Mineral Wasser 5 dl', 20),
      ('bar-01','Cola 5 dl', 30),
      ('bar-01','Rotwein Flasche', 40),
      ('bar-01','Kaffee', 50),
      ('bar-01','Becher 3 dl', 60),

      -- Food Stand
      ('food-01','Bratwurst', 10),
      ('food-01','Pommes', 20),
      ('food-01','Chicken Nuggets', 30),
      ('food-01','Burger Bun', 40),
      ('food-01','Ketchup', 50),
      ('food-01','Gabeln', 60),
      ('food-01','Gasflasche', 70)
  ) as x(public_id, item_name, sort)
  join public.locations l on l.event_id = ev_id and l.public_id = x.public_id
  join public.items i on i.event_id = ev_id and i.name = x.item_name
  on conflict (location_id, item_id) do update
    set sort = excluded.sort, active = excluded.active;

  -- 6) Runner (Beispiel)
  insert into public.runners (event_id, name, pin_hash, active)
  values
    (ev_id, 'Runner 1', crypt('1111', gen_salt('bf')), true),
    (ev_id, 'Runner 2', crypt('2222', gen_salt('bf')), true)
  on conflict do nothing;

end $$;

commit;