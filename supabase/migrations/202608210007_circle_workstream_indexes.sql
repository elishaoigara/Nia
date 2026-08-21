-- Workstream C follow-up: cover foreign keys introduced by Circle resources/responses.
-- Apply after 202608210006_circle_resources_responses.sql.

create index if not exists circle_prompts_created_by_idx
  on public.circle_prompts (created_by);
create index if not exists circle_resources_created_by_idx
  on public.circle_resources (created_by);
create index if not exists circle_responses_user_id_idx
  on public.circle_responses (user_id);
