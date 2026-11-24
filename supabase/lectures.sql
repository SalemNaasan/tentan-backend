-- Föreläsning som varje fråga hör till (t.ex. "Erytropoes"). Visas som filter och sortering på övningssidan.
-- Kör en gång i Supabase → SQL Editor.

alter table public.custom_questions add column if not exists lecture text;
create index if not exists custom_questions_lecture_idx on public.custom_questions (semester, lecture);
