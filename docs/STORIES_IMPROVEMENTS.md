# Stories improvements

Stories remains a secondary, compact part of Home. Active updates appear immediately; an empty row only shows the title and Add story button.

- Text updates support up to 280 characters and five backgrounds. They are rendered locally into PNG cards and published through the existing image upload path. This is intentionally compatible with the existing schema; the text is not separately searchable or readable as text by assistive technology after publication.
- Photo timers start after loading, preserve elapsed time when paused, and pause for reply focus/drafts, sending, viewer lists, hidden tabs, deletion and action errors.
- Video controls remain reachable; tap navigation no longer covers them. Video playback pauses during reply interactions and resumes only if previously playing.
- Views are recorded per loaded story after a brief visible interval. Opening a group no longer clears all unread items. Reopening starts at the first unseen item.
- Failed replies retain drafts. Failed or zero-row deletions leave stories visible. Sending is guarded against duplicate submissions.
- Upload limits match the shared 30 MB uploader. Existing media editing, follower audience and 24-hour expiry remain in place.

## Validation

Passed lint, TypeScript, production build, 16 unit tests, and the existing database migration/type checks (including 37 PostgreSQL/RLS assertions). Story database regressions verify follower visibility, idempotent views, contextual replies and owner-only deletion. New text-card tests cover long text, line breaks, emoji code points and invalid input.

A browser interaction check was attempted with mocked data but Chromium could not start because the execution environment denies its socket operation. Live upload, reply and playback acceptance testing is still required. No production data was changed.

## Acceptance checks

1. On a narrow phone screen, confirm Stories is visible with active updates and compact without them.
2. Publish a text card and a photo/video; confirm the follower audience and 24-hour expiry.
3. Start typing a reply, wait longer than five seconds, and verify the story and draft stay in place. Simulate a failed request; retry successfully.
4. View only one of several updates, close, and confirm the remaining updates stay unread and reopen first.
5. Pause/resume photos and videos, open the viewers list, switch tabs, and confirm playback behaves correctly.
6. Simulate failed deletion, then retry; only successful deletion should remove the story.
