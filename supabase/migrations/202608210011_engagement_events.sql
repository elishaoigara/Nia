-- Nia analytics foundation: aggregate product engagement without storing content.
create table if not exists public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(event_name) between 2 and 80),
  contribution_mode text check (contribution_mode in ('ask', 'offer', 'update', 'opportunity', 'reflection')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.engagement_events enable row level security;

drop policy if exists "users create own engagement events" on public.engagement_events;
create policy "users create own engagement events"
  on public.engagement_events for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users read own engagement events" on public.engagement_events;
create policy "users read own engagement events"
  on public.engagement_events for select to authenticated
  using (user_id = (select auth.uid()));

create index if not exists engagement_events_name_created_idx
  on public.engagement_events (event_name, created_at desc);
create index if not exists engagement_events_mode_created_idx
  on public.engagement_events (contribution_mode, created_at desc)
  where contribution_mode is not null;
create index if not exists engagement_events_user_created_idx
  on public.engagement_events (user_id, created_at desc);

comment on table public.engagement_events is 'Privacy-conscious product events for aggregate engagement analysis; do not store post content or message bodies.';
