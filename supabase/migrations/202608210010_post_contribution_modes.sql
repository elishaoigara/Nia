-- Nia Slice B: persisted contribution modes
-- Safe for existing posts: legacy rows become reflections.

alter table public.posts
  add column if not exists contribution_mode text;

update public.posts
set contribution_mode = 'reflection'
where contribution_mode is null;

alter table public.posts
  alter column contribution_mode set default 'reflection';

alter table public.posts
  alter column contribution_mode set not null;

alter table public.posts
  drop constraint if exists posts_contribution_mode_check;

alter table public.posts
  add constraint posts_contribution_mode_check
  check (contribution_mode in ('ask', 'offer', 'update', 'opportunity', 'reflection'));

create index if not exists posts_circle_mode_created_idx
  on public.posts (circle_id, contribution_mode, created_at desc)
  where circle_id is not null;

comment on column public.posts.contribution_mode is
  'Purpose of the contribution: ask, offer, update, opportunity, or reflection.';
