-- Missing prerequisites for fresh installs. Existing projects also receive these
-- definitions in the forward reconciliation migration; never reset a live DB.
create table if not exists public.account_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 account_status text not null default 'active' check (account_status in ('active','suspended','deactivated')),
 status_until timestamptz
);
create table if not exists public.close_friends (
 user_id uuid references public.profiles(id) on delete cascade,
 friend_id uuid references public.profiles(id) on delete cascade,
 primary key(user_id, friend_id)
);
create table if not exists public.follow_requests (
 requester_id uuid references public.profiles(id) on delete cascade,
 target_id uuid references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 primary key(requester_id,target_id), check(requester_id <> target_id)
);
create table if not exists public.moderation_actions (
 id uuid primary key default gen_random_uuid(),
 moderator_id uuid references public.profiles(id) on delete set null,
 report_id uuid,
 target_user_id uuid references public.profiles(id) on delete set null,
 action text not null,
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.moderation_appeals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete cascade,
 action_id uuid references public.moderation_actions(id) on delete cascade,
 reason text not null check(char_length(reason) between 10 and 2000),
 reviewed_by uuid references public.profiles(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now()
);
alter table public.account_settings enable row level security;
alter table public.close_friends enable row level security;
alter table public.follow_requests enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.moderation_appeals enable row level security;
