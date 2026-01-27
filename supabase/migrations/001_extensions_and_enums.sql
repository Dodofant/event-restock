-- 001_extensions_and_enums.sql
-- Basis: Extensions + Enums

begin;

-- UUID Generator
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type location_type as enum ('bar', 'food');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type event_status as enum ('active', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type item_category as enum ('drink', 'food', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type item_unit as enum ('stk', 'gebinde');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type item_subcategory as enum (
    -- drink
    'bier',
    'wein',
    'softdrink',
    'wasser',
    'spirituosen',
    'cocktail_mix',
    'kaffee_tee',
    'sonstiges_getraenk',
    -- food
    'fleisch',
    'vegetarisch',
    'beilage',
    'teigwaren',
    'brot_buns',
    'sauce_dressing',
    'snack',
    'sonstiges_food',
    -- other
    'einweg',
    'verpackung',
    'hygiene',
    'gas',
    'technik',
    'sonstiges_other'
  );
exception when duplicate_object then null;
end $$;

commit;
