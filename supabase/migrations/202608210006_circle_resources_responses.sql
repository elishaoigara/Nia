-- Workstream C: Circle resource shelves and structured member responses.
-- Apply after 202608210005_moderation_operations.sql.

create table if not exists public.circle_resources (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  url text not null check (char_length(url) between 1 and 1000),
  resource_type text not null default 'link' check (resource_type in ('link', 'document', 'opportunity', 'event', 'tool')),
  description text check (description is null or char_length(description) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists circle_resources_circle_created_idx
  on public.circle_resources (circle_id, created_at desc);

alter table public.circle_resources enable row level security;

drop policy if exists "Circle members read resources" on public.circle_resources;
create policy "Circle members read resources"
  on public.circle_resources for select to authenticated
  using (exists (
    select 1 from public.circle_members cm
    where cm.circle_id = circle_resources.circle_id
      and cm.user_id = (select auth.uid())
  ));

drop policy if exists "Circle owners create resources" on public.circle_resources;
create policy "Circle owners create resources"
  on public.circle_resources for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.circles c
    where c.id = circle_resources.circle_id
      and c.created_by = (select auth.uid())
  ));

drop policy if exists "Circle owners delete resources" on public.circle_resources;
create policy "Circle owners delete resources"
  on public.circle_resources for delete to authenticated
  using (created_by = (select auth.uid()));

create table if not exists public.circle_responses (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  prompt_id uuid references public.circle_prompts(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response_type text not null check (response_type in ('question', 'offer', 'update', 'support')),
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists circle_responses_circle_created_idx
  on public.circle_responses (circle_id, created_at desc);
create index if not exists circle_responses_prompt_idx
  on public.circle_responses (prompt_id, created_at desc);

alter table public.circle_responses enable row level security;

drop policy if exists "Circle members read responses" on public.circle_responses;
create policy "Circle members read responses"
  on public.circle_responses for select to authenticated
  using (exists (
    select 1 from public.circle_members cm
    where cm.circle_id = circle_responses.circle_id
      and cm.user_id = (select auth.uid())
  ));

drop policy if exists "Circle members create responses" on public.circle_responses;
create policy "Circle members create responses"
  on public.circle_responses for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.circle_members cm
    where cm.circle_id = circle_responses.circle_id
      and cm.user_id = (select auth.uid())
  ));

drop policy if exists "Users delete own responses" on public.circle_responses;
create policy "Users delete own responses"
  on public.circle_responses for delete to authenticated
  using (user_id = (select auth.uid()));
