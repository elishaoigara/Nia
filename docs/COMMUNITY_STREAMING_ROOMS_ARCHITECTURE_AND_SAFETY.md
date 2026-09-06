# Nia Community Streaming Rooms

**Architecture and Safety Blueprint**  
**Status:** Design-ready proposal  
**Scope:** Circle-based live audio/video rooms

## Executive direction

Nia should build **Circle rooms, not celebrity broadcasts**. A room should exist because people share a purpose: a project clinic, co-working session, skill exchange, music listening room, community debate, or cultural story night. The success measure is useful participation—questions answered, resources shared, new collaboration, or a clear next step—not raw watch time.

The recommended first release is **audio-first with optional video**, built on a managed WebRTC Selective Forwarding Unit (SFU) and Nia-owned control, identity, Circle, moderation, and consent data. An SFU lets each publisher send one encoded stream while the server forwards selected tracks to subscribers, which is more suitable than peer-to-peer mesh for multi-person rooms [1].

> **Launch rule:** No room goes live without a purpose, a host/co-host structure, an audience policy, moderation controls, and a consent decision for recording.

## 1. System architecture

```text
Nia web app
  ├─ Circle membership, room discovery, scheduling, roles, chat, questions, resources
  ├─ Server-side authorization and short-lived media-token endpoint
  ├─ Supabase Postgres + RLS + audit events
  └─ Supabase Realtime for scoped low-volume room events
             │
             ▼
      WebRTC media adapter
             │
             ▼
        Managed SFU
  audio/video tracks, adaptive layers, reconnects, optional recording
             │
             ▼
      Provider callbacks
  participant events, recording state, failures → Nia audit and moderation flows
```

| Layer | Responsibility | Initial implementation |
|---|---|---|
| Application | Room previews, Circle identity, scheduling, roles, questions, chat, resources, reports | Existing Next.js App Router and Supabase project |
| Control plane | Verify membership and role, issue tokens, execute moderation commands, record audit events | Server-only Next.js route handlers or a small provider-neutral service |
| Media plane | WebRTC signaling, SFU forwarding, adaptive quality, reconnects, audio/video | Managed SFU provider during pilot |
| Realtime event plane | Presence hints, chat, question state, hand raises, room status | Supabase Realtime with room-scoped subscriptions |
| Durable data | Rooms, roles, messages, questions, consents, reports, recordings | Supabase Postgres and object storage |
| Async processing | Recording finalization, captions, summary draft, retention cleanup | Verified provider callbacks and server jobs |

The provider adapter should expose only Nia-level operations such as `createRoom`, `issueJoinToken`, `muteParticipant`, `removeParticipant`, `endRoom`, and `finalizeRecording`. Provider identifiers must remain opaque to clients. Never expose a service-role key or media-provider secret in the browser.

## 2. Room lifecycle and experience

A host creates a room from a Circle and supplies a title, purpose, language, approximate duration, audience mode, and recording choice. The room enters `draft`, then `scheduled`, and only becomes `live` after the host passes a preflight check. The preflight recommends a co-host, confirms the prompt, verifies microphone/camera permissions, and displays the moderation controls.

Before joining, a member sees the Circle identity, hosts, purpose, language, estimated duration, recording/caption status, and reporting route. Listeners enter with camera off by default. The room surface contains the live media area, room prompt, participant mode indicator, question queue, text chat, reactions, shared resources, connection/data status, and leave/report controls.

The end state matters. When the room ends, Nia should offer a host-edited summary, shared links, unanswered questions, and a Circle follow-up prompt. A recording is never automatically public. It becomes a private processing artifact first, then may be published only after consent and safety checks pass.

## 3. Proposed data model

These are additive migration targets, not instructions to apply automatically.

| Table | Purpose | Key fields |
|---|---|---|
| `streaming_rooms` | Schedule and lifecycle | `id`, `circle_id`, `created_by`, `title`, `purpose`, `language`, `status`, `audience_mode`, `recording_mode`, `provider_room_name`, timestamps |
| `streaming_room_members` | Room-specific roles and restrictions | `room_id`, `user_id`, `role`, `status`, `muted_until`, `removed_at`, join/leave timestamps |
| `streaming_room_questions` | Moderated questions | `room_id`, `asked_by`, `body`, `status`, `answered_by`, `answered_at` |
| `streaming_room_chat` | Chat with moderation state | `room_id`, `user_id`, `body`, `status`, `reply_to_id`, timestamps |
| `streaming_room_resources` | Links and Circle resources | `room_id`, `shared_by`, `label`, `kind`, `url_or_resource_id` |
| `streaming_room_reactions` | Bounded reaction stamps | `room_id`, `user_id`, `reaction`, timestamp |
| `streaming_room_consents` | Recording/transcription/display consent | `room_id`, `user_id`, `consent_type`, `choice`, `version`, timestamps |
| `streaming_room_reports` | Reports against room, member, message, or media | `room_id`, `reporter_id`, target fields, `reason`, `status` |
| `streaming_room_audit_events` | Restricted operational and safety trail | actor, room, target, event type, reason, metadata, timestamp |
| `streaming_room_recordings` | Recording lifecycle and retention | `room_id`, storage key, status, consent snapshot, expiry, publication state |

Use constrained states: rooms `draft`, `scheduled`, `live`, `paused`, `ended`, `cancelled`, `safety_hold`; membership `host`, `co_host`, `speaker`, `listener`, `moderator`; and chat/questions `visible`, `held`, `hidden`, `removed`, `resolved`.

Do not duplicate Circle membership. Private-room access must consult `circle_members` plus room-specific restrictions. A public room may be discoverable, but the host policy and safety controls must still be visible before joining.

## 4. Authorization and realtime rules

Every room table must use RLS. The server must re-check identity, Circle membership, room state, audience mode, and role whenever it issues or refreshes a media token. Tokens should be short-lived, room-scoped, and least-privilege. Current media-platform guidance similarly models tokens around opaque participant identity, room, expiry, and granular publish/subscribe/moderation grants [2]. Do not place names, email addresses, phone numbers, or other PII in provider room names or participant identities [2].

| Actor | Permission boundary |
|---|---|
| Visitor | Public preview metadata only; no private chat, questions, reports, presence, or recordings. |
| Circle member | Join as listener, read visible room content, ask questions, react, report, and manage own consent. |
| Host | Schedule/edit own room, appoint co-hosts/speakers, moderate, pause, end, and publish an approved summary. |
| Co-host | Moderate chat/questions, manage speakers, mute/remove within room scope, and manage resources. No Circle membership or ownership transfer. |
| Trusted moderator | Restricted safety queue, enforcement, appeals, and audit review. |
| Server process | Provider synchronization, recording finalization, retention, and controlled audit writes only. |

Use WSS/TLS, explicit trusted-origin validation, message-level authorization, schema validation, payload limits, rate limits, session revalidation, and event logging. These controls address the WebSocket risks identified by OWASP, including cross-site hijacking, authentication bypass, injection, connection exhaustion, and monitoring gaps [3].

Subscribe only to room-scoped Realtime events. Keep reports, consent changes, removals, and moderator actions on restricted channels. De-duplicate optimistic and incoming rows, show a disconnected/reconnecting state, and remove subscriptions on unmount. Supabase documents table publication and filtered Postgres-change subscriptions as the basis for this pattern [4].

## 5. Safety requirements

### Admission and room design

Room creation must require a clear purpose, audience mode, language, duration, and moderation plan. Support **Circle only**, **invited guests**, and **public preview with controlled entry**. Sensitive rooms should allow approval-before-speaking, disabled participant publishing, disabled direct contact, and slow mode.

The pre-join disclosure must state whether audio/video, chat, captions, or transcripts are recorded; who can access them; how long they are retained; and how to report harm. Do not expose precise presence or a full participant list to unauthorized viewers.

### Host and moderator controls

Hosts and co-hosts need mute, move-to-listener, approve/deny hand raise, remove, block re-entry, hold/delete chat, slow mode, pause room, disable publishing, safety hold, and end-room controls. Every high-impact action must create an immutable audit event containing actor, target, room, action, reason code, timestamp, and provider result.

A safety hold must immediately stop new joins, disable publishing, preserve the room’s evidence state, notify authorized moderators, and provide the host with a calm recovery path. It must not expose the report reason publicly.

### Chat and question safety

Questions should be queue-first. Chat requires rate limits, slow mode, link restrictions, blocked-term controls, duplicate suppression, and one-tap reporting. Automated classification can assist triage but cannot be the sole basis for permanent sanctions.

Escalate threats, doxxing, scams, impersonation, coordinated harassment, sexual exploitation, and non-consensual intimate imagery to the restricted safety queue. Remove severe content from discovery and recommendation surfaces while preserving only the minimum evidence needed for review and appeal.

### Recording and consent

Recording is opt-in at room level and explicit at participant level. Consent must be versioned and associated with the room and participant. If consent is withdrawn, exclude the participant’s media where technically possible; otherwise stop recording or remove the participant from the recorded segment.

Recordings default to private processing. Publication to a Circle requires a valid consent snapshot, safety review state, editable captions/summary, and explicit host action. Generated captions and summaries are drafts, not authoritative statements, and must be removable.

### Privacy and retention

Minimize location, device, and presence data. Avoid biometric inference and automatic disclosure of exact location. Keep ephemeral presence and chat for a defined short retention window, retain audit and appeal evidence under a separate policy, and require an expiry for every recording. All moderator access, exports, publication, and consent changes must be auditable.

## 6. Low-data and accessibility contract

Every room must support camera-off, audio-only, and text participation. Provide a low-bitrate mode, poster fallback, reconnect retry, visible bandwidth state, and a clear “continue with audio” action. Audio-only and text participants are full members, not lower-status viewers.

At 320 CSS pixels, controls must reflow without overlap or horizontal scrolling. Use semantic buttons, visible focus, accessible names, keyboard operation where supported, minimum 44px touch targets, readable captions, and reduced-motion behavior. Captions should be resizable and remain legible against changing media backgrounds. WCAG’s reflow guidance provides the relevant accessibility target for narrow layouts [5].

## 7. Observability and incident response

Track join success, time to first media, reconnect rate, audio fallback, publish failures, caption latency, report rate, moderation response time, removals, consent failures, and room completion. Keep safety events in a restricted stream; never turn reports or removals into public popularity signals.

Alert on provider outages, token anomalies, report spikes, recording-consent mismatches, repeated room failures, and unusual removal rates. Correlate Nia server logs, provider callbacks, and audit events with opaque IDs while avoiding raw private chat or media content in logs.

## 8. Delivery sequence and gates

| Phase | Scope | Gate |
|---|---|---|
| 0 | Provider proof on Android, low-bitrate, captions, reconnect, and African mobile networks | Measured latency, failure, data, and cost envelope. |
| 1 | Room tables, RLS, Circle access, roles, audit events, scheduling, token endpoint | Unauthorized token/data access tests pass. |
| 2 | Listener pilot: audio/video, text, questions, resources, reports | Disposable multi-account E2E tests pass at 320/375/390px. |
| 3 | Speaker and moderation pilot | Mute/remove/hold/end actions and audit lifecycle pass. |
| 4 | Consent-controlled recordings and captions | No publication with missing, withdrawn, or inconsistent consent. |
| 5 | Circle artifact loop and limited trusted-Circle rollout | Safety drills, rollback runbook, and operational thresholds pass. |

The first implementation should be **audio-first plus optional video**, using a managed SFU behind a provider-neutral adapter. A self-hosted SFU can be evaluated only after Nia has measured real usage, safety workload, regional reliability, and operational capacity.

## 9. Acceptance tests

| Area | Required result |
|---|---|
| Authorization | Non-members cannot obtain private-room tokens; listeners cannot publish or moderate. |
| Circle integrity | Removing Circle membership blocks new access and token refresh. |
| Realtime | No duplicate chat/questions; reconnect state is visible; channels clean up. |
| Moderation | Report → restricted queue → resolution → audit event works; unauthorized users cannot read or mutate the queue. |
| Host safety | Host can appoint co-host, mute/remove, pause, and end; each action is logged. |
| Recording | Publication is blocked unless consent snapshot and safety state are valid. |
| Recovery | Weak connection supports reconnect, audio fallback, or text continuation without losing room context. |
| Accessibility | Keyboard, focus, names, contrast, captions, reduced motion, touch targets, and 320px reflow pass review. |
| Privacy | Reports, consents, precise presence, and moderation metadata remain restricted. |

## 10. Flicks production-test note

The requested production interaction test for **Fresh**, **Saved**, **My Circles**, and bookmarking was skipped as requested. The live route redirected to `/login?next=%2Fflicks`, and no authenticated disposable test session was available. Therefore, production interaction behavior remains unverified; the previous local quality gate passed lint, strict TypeScript, unit tests, build, and whitespace checks.

## References

[1]: https://docs.livekit.io/reference/internals/livekit-sfu/ "LiveKit SFU architecture"

[2]: https://docs.livekit.io/frontends/reference/tokens-grants/ "LiveKit access tokens and grants"

[3]: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html "OWASP WebSocket Security Cheat Sheet"

[4]: https://supabase.com/docs/guides/realtime/postgres-changes "Supabase Realtime Postgres Changes"

[5]: https://www.w3.org/WAI/WCAG21/Understanding/reflow.html "W3C WCAG 2.1 Reflow"
