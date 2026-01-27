-- 004_constraints_and_views.sql
-- Zusatz-Constraints + Views + Helper Functions

begin;

-- 1) Sicherstellen: Subcategory passt zur Category
-- (Das verhindert zB. category=food aber subcategory=bier)
do $$ begin
  alter table public.items
    add constraint items_subcategory_matches_category
    check (
      (category = 'drink' and subcategory in (
        'bier','wein','softdrink','wasser','spirituosen','cocktail_mix','kaffee_tee','sonstiges_getraenk'
      ))
      or
      (category = 'food' and subcategory in (
        'fleisch','vegetarisch','beilage','teigwaren','brot_buns','sauce_dressing','snack','sonstiges_food'
      ))
      or
      (category = 'other' and subcategory in (
        'einweg','verpackung','hygiene','gas','technik','sonstiges_other'
      ))
    );
exception when duplicate_object then null;
end $$;

-- 2) Active Event Helper
create or replace function public.get_active_event_id()
returns uuid
language sql
stable
as $$
  select active_event_id
  from public.app_settings
  where id = 1
$$;

-- 3) View: Active Event
create or replace view public.v_active_event as
select
  e.*
from public.events e
join public.app_settings s on s.id = 1 and s.active_event_id = e.id;

-- 4) View: Locations des aktiven Events
create or replace view public.v_active_locations as
select
  l.*
from public.locations l
join public.app_settings s on s.id = 1 and s.active_event_id = l.event_id;

-- 5) View: Items des aktiven Events
create or replace view public.v_active_items as
select
  i.*
from public.items i
join public.app_settings s on s.id = 1 and s.active_event_id = i.event_id;

commit;