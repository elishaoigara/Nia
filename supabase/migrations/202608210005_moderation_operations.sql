-- Workstream B: moderator roles, report queues, and audit permissions.
-- Apply after 202608210004_circle_activity_moderation.sql.
-- Seed trusted moderators through the Supabase dashboard or a server-side
-- migration using the target auth.users UUIDs. Do not expose role insertion to clients.

create table if not exists public.moderator_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.moderator_roles enable row level security;

drop policy if exists "Users can read their own moderator role" on public.moderator_roles;
create policy "Users can read their own moderator role"
  on public.moderator_roles for select to authenticated
  using (user_id = (select auth.uid()));

-- Existing report tables remain user-submittable, while trusted moderators can
-- read and resolve queue items. The moderator role table is intentionally not
-- client-writable, so only an operator with database access can appoint staff.
alter table public.reports enable row level security;
alter table public.message_reports enable row level security;
alter table public.circle_reports enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "Moderators read reports" on public.reports;
create policy "Moderators read reports"
  on public.reports for select to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators update reports" on public.reports;
create policy "Moderators update reports"
  on public.reports for update to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())))
  with check (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators read message reports" on public.message_reports;
create policy "Moderators read message reports"
  on public.message_reports for select to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators update message reports" on public.message_reports;
create policy "Moderators update message reports"
  on public.message_reports for update to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())))
  with check (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators read circle reports" on public.circle_reports;
create policy "Moderators read circle reports"
  on public.circle_reports for select to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators update circle reports" on public.circle_reports;
create policy "Moderators update circle reports"
  on public.circle_reports for update to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())))
  with check (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators read moderation actions" on public.moderation_actions;
create policy "Moderators read moderation actions"
  on public.moderation_actions for select to authenticated
  using (exists (select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())));

drop policy if exists "Moderators create moderation actions" on public.moderation_actions;
create policy "Moderators create moderation actions"
  on public.moderation_actions for insert to authenticated
  with check (moderator_id = (select auth.uid()) and exists (
    select 1 from public.moderator_roles mr where mr.user_id = (select auth.uid())
  ));

create index if not exists moderator_roles_role_idx on public.moderator_roles (role);
