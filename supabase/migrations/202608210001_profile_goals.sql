-- Purpose-led identity fields for onboarding and community discovery.
-- Run with `supabase db push` or execute this file in the Supabase SQL editor.

alter table public.profiles
  add column if not exists goals text[] not null default '{}';

comment on column public.profiles.goals is
  'Short-term purposes a member wants to pursue on Nia, such as learning, building, finding opportunities, or supporting community.';

create index if not exists profiles_goals_gin_idx
  on public.profiles using gin (goals);
