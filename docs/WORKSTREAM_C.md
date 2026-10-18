# Workstream C: Circle Resources and Structured Responses

## Purpose

Workstream C makes Circle participation useful beyond posting. Members can find a shared shelf of links, tools, opportunities, and events, then contribute through explicit response modes: **I can help**, **I have a question**, **Progress update**, and **Encouragement**.

## Migration

Apply `supabase/migrations/202608210006_circle_resources_responses.sql` after migrations `202608210001` through `202608210005`. Do not run the original initial schema migration against the existing Nia project.

The migration creates `circle_resources` and `circle_responses`. Members can read resources and responses for Circles they belong to. Only Circle owners can create or delete resources. Members can create responses for Circles they belong to and delete their own responses.

## UI

The Circle detail page now includes `CircleResources` and `CircleResponses` after the conversation starter and before the generic post composer. The resource shelf is owner-managed. The response stream is member-authored and typed. Both components show a migration-not-applied error instead of failing silently.

## Acceptance criteria

| Scenario | Expected result |
|---|---|
| A non-member opens a Circle | Resource and response content is not exposed by the client query or RLS. |
| A member opens a Circle | Shared resources and recent responses are visible. |
| A Circle owner adds a resource | The resource is stored and appears at the top of the shelf. |
| A non-owner tries to add a resource | The database rejects the insert through RLS. |
| A member posts a response | The response type and content are stored and rendered. |
| A user forges another user ID | RLS rejects the response insert because `user_id` must equal `auth.uid()`. |
| The migration is not applied | The app shows an actionable availability message rather than a framework error. |

## Manual test order

Create or join a Circle, verify the resource and response sections, add a resource as the owner, post each response type as a member, and confirm access is denied for a non-member. Then inspect `circle_resources` and `circle_responses` in the Supabase table editor.
