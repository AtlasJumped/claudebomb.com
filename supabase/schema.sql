-- claudebomb accounts: saved prompts. Run once in the Supabase SQL editor.
create table if not exists public.saved_prompts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  prompt_id text,
  title text,
  url text,
  text text not null default '',
  model text,
  share_for_improvement boolean not null default true,
  credit_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.saved_prompts enable row level security;
-- each person sees and changes only their own rows
create policy "own rows: read" on public.saved_prompts for select using (auth.uid() = user_id);
create policy "own rows: add" on public.saved_prompts for insert with check (auth.uid() = user_id);
create policy "own rows: change" on public.saved_prompts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.saved_prompts for delete using (auth.uid() = user_id);
-- Improving shared prompts: run as the project owner (service role) on rows where share_for_improvement is true.
-- Credit goes to credit_name; a blank credit_name means no credit.
