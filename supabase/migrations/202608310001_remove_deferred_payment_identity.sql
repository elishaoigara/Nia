-- Retire the deferred commerce and identity-badge data model.
-- The baseline schema no longer creates these objects; this migration removes
-- them from projects that applied an earlier Nia schema.

begin;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id = old.id;
  new.created_at = old.created_at;
  return new;
end;
$$;

drop table if exists public.verified_payments;
drop table if exists public.tips;
alter table public.profiles drop column if exists is_verified;

commit;
