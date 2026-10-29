-- Row Level Security för tentan.nu
--
-- Kör detta i Supabase → SQL Editor FÖRST när SUPABASE_SERVICE_ROLE_KEY är satt
-- i Vercel och den nya koden är driftsatt. Annars slutar adminpanelen kunna spara.
--
-- Efter detta får anon-nyckeln (som syns i webbläsaren) bara LÄSA publika tabeller.
-- All skrivning går via API-routes som kontrollerar admininloggning och använder
-- service role-nyckeln (som kringgår RLS).

-- 1. Slå på RLS på alla tabeller
alter table public.custom_questions      enable row level security;
alter table public.deleted_question_ids  enable row level security;
alter table public.hidden_question_ids   enable row level security;
alter table public.ppl_cases             enable row level security;
alter table public.case_question_scores  enable row level security;
alter table public.question_feedback     enable row level security;
alter table public.app_news              enable row level security;

-- 2. Ta bort alla gamla policies på tabellerna (de kan tillåta skrivning för anon)
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('custom_questions', 'deleted_question_ids', 'hidden_question_ids',
                        'ppl_cases', 'case_question_scores', 'question_feedback', 'app_news')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 3. Endast läsrätt för allmänheten. question_feedback får ingen policy alls,
--    så den kan bara läsas/skrivas via servern.
create policy "Public read" on public.custom_questions     for select using (true);
create policy "Public read" on public.deleted_question_ids for select using (true);
create policy "Public read" on public.hidden_question_ids  for select using (true);
create policy "Public read" on public.ppl_cases            for select using (true);
create policy "Public read" on public.case_question_scores for select using (true);
create policy "Public read" on public.app_news             for select using (true);

-- 4. Bildlagringen: ta bort policies som låter anon ladda upp/ändra/radera i
--    bucketen "question-images". Bucketen är publik, så bilderna visas ändå.
--    Kör först denna fråga och titta på vilka policies som finns:
--
--      select policyname, cmd, qual, with_check from pg_policies
--      where schemaname = 'storage' and tablename = 'objects';
--
--    Ta sedan bort de som gäller INSERT/UPDATE/DELETE för question-images, t.ex.:
--
--      drop policy "Policy-namnet-här" on storage.objects;
