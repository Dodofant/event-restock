-- 005_rls_policies.sql
-- RLS einschalten und standardmaessig "dicht" machen.
-- Wichtig: Supabase service_role umgeht RLS automatisch.
-- Das ist ideal, wenn du alle DB-Zugriffe ueber deine Next API Routes machst.

begin;

-- RLS aktivieren
alter table public.events enable row level security;
alter table public.app_settings enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.location_items enable row level security;
alter table public.runners enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;

-- Optional: auch "force", damit wirklich keine impliziten Rechte durchrutschen.
-- Service role geht trotzdem immer durch.
alter table public.events force row level security;
alter table public.app_settings force row level security;
alter table public.locations force row level security;
alter table public.items force row level security;
alter table public.location_items force row level security;
alter table public.runners force row level security;
alter table public.orders force row level security;
alter table public.order_lines force row level security;

-- Keine Policies = fuer anon/authenticated ist alles blockiert.
-- Falls du spaeter clientseitig (anon/auth) lesen willst, erstellen wir gezielte Policies.

commit;