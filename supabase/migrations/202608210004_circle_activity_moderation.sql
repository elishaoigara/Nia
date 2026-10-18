-- Workstream B: Circle activity prompts and Circle reporting.
-- Apply after the existing Nia incremental migrations.

create table if not exists public.circle_prompts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 280),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists circle_prompts_circle_active_idx
  on public.circle_prompts (circle_id, is_active, created_at desc);

alter table public.circle_prompts enable row level security;

drop policy if exists "Circle members read prompts" on public.circle_prompts;
create policy "Circle members read prompts"
  on public.circle_prompts for select to authenticated
  using (exists (
    select 1 from public.circle_members cm
    where cm.circle_id = circle_prompts.circle_id
      and cm.user_id = (select auth.uid())
  ));

drop policy if exists "Circle owners create prompts" on public.circle_prompts;
create policy "Circle owners create prompts"
  on public.circle_prompts for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.circles c
    where c.id = circle_prompts.circle_id
      and c.created_by = (select auth.uid())
  ));

drop policy if exists "Circle owners update prompts" on public.circle_prompts;
create policy "Circle owners update prompts"
  on public.circle_prompts for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "Circle owners delete prompts" on public.circle_prompts;
create policy "Circle owners delete prompts"
  on public.circle_prompts for delete to authenticated
  using (created_by = (select auth.uid()));

create table if not exists public.circle_reports (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists circle_reports_circle_id_idx on public.circle_reports (circle_id);
create index if not exists circle_reports_reporter_id_idx on public.circle_reports (reporter_id);
create index if not exists circle_reports_status_created_idx on public.circle_reports (status, created_at desc);

alter table public.circle_reports enable row level security;

drop policy if exists "Users file circle reports" on public.circle_reports;
create policy "Users file circle reports"
  on public.circle_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "Users read own circle reports" on public.circle_reports;
create policy "Users read own circle reports"
  on public.circle_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
