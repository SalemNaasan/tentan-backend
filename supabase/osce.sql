-- OSCE-stationer som ändrats eller lagts till i admin.
-- Varje rad är en hel station (JSON). Samma id som en station i koden ersätter den,
-- ett nytt id blir en ny station och "hidden": true döljer stationen på sajten.
-- Kör en gång i Supabase → SQL Editor.

create table if not exists public.osce_stations (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.osce_stations enable row level security;

-- Alla får läsa (sajten visar stationerna); skrivningar går via servern med service-role-nyckeln
drop policy if exists "Public read" on public.osce_stations;
create policy "Public read" on public.osce_stations for select using (true);
