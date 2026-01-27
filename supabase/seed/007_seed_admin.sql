-- 004_seed_admin.sql
insert into public.admins (username, password_hash, active)
values ('admin', crypt('YOUR_STRONG_PASSWORD', gen_salt('bf', 12)), true)
on conflict (username) do update
set password_hash = excluded.password_hash,
    active = true;