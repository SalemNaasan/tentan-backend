-- Daglig gräns för AI-chatten: räknar frågor per besökare och för hela sajten.
-- Kör en gång i Supabase → SQL Editor.

create table if not exists public.chat_usage (
  key text not null,
  day date not null default (now() at time zone 'Europe/Stockholm')::date,
  count integer not null default 0,
  primary key (key, day)
);

alter table public.chat_usage enable row level security; -- bara servern (service role) kommer åt tabellen

-- Räknar upp en fråga för nyckeln och returnerar nytt antal för i dag
create or replace function public.chat_take(p_key text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into chat_usage (key, day, count)
  values (p_key, (now() at time zone 'Europe/Stockholm')::date, 1)
  on conflict (key, day) do update set count = chat_usage.count + 1
  returning count;
$$;

revoke all on function public.chat_take(text) from public, anon, authenticated;
