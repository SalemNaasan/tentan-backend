-- Kommentarer på övningsfrågorna. Alla kan läsa och skriva (via servern), admin kan ta bort.
-- parent_id pekar på kommentaren man svarar på (null = ny tråd).
-- Kör en gång i Supabase → SQL Editor.

create table if not exists public.question_comments (
  id text primary key,
  question_id text not null,
  parent_id text references public.question_comments(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists question_comments_question_idx on public.question_comments (question_id, created_at);

alter table public.question_comments enable row level security;

-- Alla får läsa; skrivningar och borttagning går via servern med service-role-nyckeln
drop policy if exists "Public read" on public.question_comments;
create policy "Public read" on public.question_comments for select using (true);
