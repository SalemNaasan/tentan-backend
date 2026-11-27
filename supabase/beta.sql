-- Betafrågor: syns bara för den som aktiverat en betakod på /beta (och i admin).
-- Kör en gång i Supabase → SQL Editor.

alter table public.custom_questions add column if not exists is_beta boolean not null default false;
