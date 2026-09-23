-- Ensure posts, comments, and profiles can enter the moderation queue.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('post', 'comment', 'profile')),
  entity_id uuid,
  reason text not null check (char_length(reason) between 1 and 120),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_assigned_to_idx on public.reports (assigned_to);

alter table public.reports enable row level security;

drop policy if exists "active accounts submit reports" on public.reports;
drop policy if exists "users submit content reports" on public.reports;
create policy "users submit content reports"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_user_id is distinct from (select auth.uid())
    and private.is_account_active((select auth.uid()))
  );

drop policy if exists "users read own content reports" on public.reports;
create policy "users read own content reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "Moderators read reports" on public.reports;
create policy "Moderators read reports"
  on public.reports for select to authenticated
  using (exists (
    select 1 from public.moderator_roles mr
    where mr.user_id = (select auth.uid())
  ));

drop policy if exists "Moderators update reports" on public.reports;
create policy "Moderators update reports"
  on public.reports for update to authenticated
  using (exists (
    select 1 from public.moderator_roles mr
    where mr.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.moderator_roles mr
    where mr.user_id = (select auth.uid())
  ));
