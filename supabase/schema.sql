-- HMR family accounts (Supabase project "HMR Family"). Safe to run more than once in the SQL editor.
-- Every table has row level security on. The site uses only the publishable key; nothing here needs the secret key.

-- 1. claudebomb.com saved prompts: each person sees and changes only their own rows
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

-- 2. claudebomb.com votes: one vote per person per prompt; totals are public through prompt_vote_counts()
create table if not exists public.prompt_votes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prompt_id text not null check (char_length(prompt_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);
alter table public.prompt_votes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'saved_prompts' and policyname = 'own rows: read') then
    create policy "own rows: read" on public.saved_prompts for select to authenticated using (auth.uid() = user_id);
    create policy "own rows: add" on public.saved_prompts for insert to authenticated with check (auth.uid() = user_id);
    create policy "own rows: change" on public.saved_prompts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy "own rows: delete" on public.saved_prompts for delete to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompt_votes' and policyname = 'own votes: read') then
    create policy "own votes: read" on public.prompt_votes for select to authenticated using (auth.uid() = user_id);
    create policy "own votes: add" on public.prompt_votes for insert to authenticated with check (auth.uid() = user_id);
    create policy "own votes: remove" on public.prompt_votes for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Table permissions for signed-in people (row level security still limits them to their own rows).
-- Nobody outside gets table access to dog_signups; the site uses the two functions below.
grant select, insert, update, delete on public.saved_prompts to authenticated;
grant select, insert, delete on public.prompt_votes to authenticated;
revoke all on public.dog_signups from anon, authenticated;

create or replace function public.prompt_vote_counts()
returns table (prompt_id text, votes bigint)
language sql stable security definer set search_path = public
as $$ select v.prompt_id, count(*)::bigint from public.prompt_votes v group by v.prompt_id $$;

-- 3. ilovedogs.dog city meters: reservations (owners) and volunteers. No policies: nobody can read emails through the API.
--    The site adds rows only through dog_signup() and reads only totals through dog_counts().
create table if not exists public.dog_signups (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('owner', 'volunteer')),
  city text not null check (city in ('la', 'dc', 'other')),
  email text not null check (char_length(email) between 3 and 254),
  dogs int not null default 1 check (dogs between 1 and 20),
  created_at timestamptz not null default now(),
  unique (kind, city, email)
);
alter table public.dog_signups enable row level security;

create or replace function public.dog_signup(p_kind text, p_city text, p_email text, p_dogs int default 1)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare e text := lower(trim(p_email));
begin
  if p_kind not in ('owner', 'volunteer') or p_city not in ('la', 'dc', 'other')
     or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 254 then
    return false;
  end if;
  insert into public.dog_signups (kind, city, email, dogs)
  values (p_kind, p_city, e, greatest(1, least(coalesce(p_dogs, 1), 20)))
  on conflict (kind, city, email) do update set dogs = excluded.dogs;
  return true;
end $$;

create or replace function public.dog_counts()
returns table (city text, owners bigint, dogs bigint, volunteers bigint)
language sql stable security definer set search_path = public
as $$
  select s.city,
         count(*) filter (where s.kind = 'owner')::bigint,
         coalesce(sum(s.dogs) filter (where s.kind = 'owner'), 0)::bigint,
         count(*) filter (where s.kind = 'volunteer')::bigint
  from public.dog_signups s group by s.city
$$;

revoke all on function public.prompt_vote_counts() from public;
revoke all on function public.dog_signup(text, text, text, int) from public;
revoke all on function public.dog_counts() from public;
grant execute on function public.prompt_vote_counts() to anon, authenticated;
grant execute on function public.dog_signup(text, text, text, int) to anon, authenticated;
grant execute on function public.dog_counts() to anon, authenticated;

-- Improving shared prompts: run as the project owner on saved_prompts rows where share_for_improvement is true.
-- Credit goes to credit_name; a blank credit_name means no credit.
