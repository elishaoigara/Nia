-- The initial schema contains public.mutes, but some production databases
-- were migrated before that definition was present in the deployed schema.
create table if not exists public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

alter table public.mutes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mutes' and policyname = 'users read own mutes'
  ) then
    create policy "users read own mutes" on public.mutes
      for select to authenticated using (muter_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mutes' and policyname = 'users create own mutes'
  ) then
    create policy "users create own mutes" on public.mutes
      for insert to authenticated with check (muter_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mutes' and policyname = 'users delete own mutes'
  ) then
    create policy "users delete own mutes" on public.mutes
      for delete to authenticated using (muter_id = auth.uid());
  end if;
end
$$;

notify pgrst, 'reload schema';
