# Nia Accessibility and Safety Audit

**Date:** 22 August 2026  
**Scope:** CircleCard, Circle directory, Circle responses, Circle filters, Flicks action rail and metadata, moderation queue, shared responsive styles, and live Vercel entry routes.

## Executive assessment

The updated components have a solid accessibility foundation: native buttons and links are used for primary actions, response and moderation filters expose `aria-pressed`, report and moderation errors use `role="alert"`, labels are now provided for Flicks action buttons, and the key mobile filter rows intentionally scroll rather than compressing labels. The implementation is **not yet a formal WCAG 2.1 AA conformance claim**, because authenticated mobile rendering and assistive-technology testing require an authenticated session that was not available in this environment.

## Audit matrix

| WCAG area | Evidence reviewed | Result | Follow-up |
| --- | --- | --- | --- |
| Keyboard operability | Native `<button>` and `<a>` controls in Circle, Flicks, and moderation surfaces | Pass by source review | Verify tab order and Escape behavior in authenticated browser QA. |
| Names and roles | Circle join buttons have contextual `aria-label`; Flicks like/comment/share controls use explicit labels; filters expose `aria-pressed` | Pass by source review | Add labels to any remaining icon-only mute/search controls where not already present. |
| Error identification | Moderation and Circle response errors use `role="alert"`; Flicks exposes retry UI | Pass by source review | Confirm announcements with a screen reader. |
| Reflow at 320px | Flexible Circle card titles, wrapping metadata, stacked mobile filters, scrollable purpose rows, and Flicks metadata width correction | Pass by source review; live authenticated rendering blocked | Verify at 320, 375, and 390 CSS px with no horizontal document overflow. |
| Touch targets | Join and moderation controls use comfortable padding; Flicks circular controls use 42px visual targets | Partial | Increase Flicks circular controls to at least 44px if device QA shows the effective target is below the AA-adjacent mobile standard. |
| Contrast | Existing Nia tokens and dark video overlays reviewed | Needs rendered contrast measurement | Run axe or Lighthouse on authenticated light and dark routes. |
| Motion | Flicks autoplay, heart burst, and transitions reviewed in source | Needs manual test | Verify `prefers-reduced-motion` behavior and provide a non-motion alternative where needed. |
| Focus visibility | Native controls are present; shared focus behavior requires rendered inspection | Needs manual test | Tab through all updated controls in desktop and mobile browser emulation. |
| Moderation authorization | Client checks moderator role; report sources are protected by Supabase RLS according to existing workflow | Not fully exercised | Run disposable two-account E2E with moderator and non-moderator identities. |

The criteria correspond to WCAG 2.1 AA guidance for keyboard access, focus visibility, reflow, contrast, and name/role/value semantics.[1] [2] [3] [4] [5]

## Safety workflow test

The repository does not currently contain a dedicated automated report-to-moderation E2E spec. The existing Playwright fixture correctly refuses to mutate a remote Supabase project unless `E2E_SUPABASE_URL`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, and explicit isolated-staging approval are present. Running the live suite produced **3 passed and 2 safely blocked** tests; the blocked cases stopped at the fixture guard rather than touching production data.

The report workflow therefore remains a **manual/staging release gate**. The required test is: create a disposable member and moderator; submit a report against a disposable post; verify success feedback; confirm the report is absent for the member and visible to the moderator; mark it reviewed; resolve it; verify the moderation audit record; and confirm the member cannot update or delete queue records. Use a temporary Circle/post and delete all fixture data afterward.

## Live production inspection

Both requested authenticated routes redirected to login:

| Route | Live result |
| --- | --- |
| `/circles/uni-life-kenya` | Redirected to `/login?next=%2Fcircles%2Funi-life-kenya`. |
| `/flicks` | Redirected to `/login?next=%2Fflicks`. |

The public login entry rendered correctly. Authenticated mobile visual inspection could not be completed without a disposable test account or browser takeover. This is an access limitation, not evidence of a production layout defect.

## Recommended remediation order

First, run authenticated browser checks at 320, 375, 390, and desktop widths with axe-core or Lighthouse. Second, add and run a dedicated report-to-moderation Playwright spec against isolated staging. Third, verify reduced-motion, focus, contrast, and screen-reader announcements manually. Finally, consider enlarging the Flicks circular controls from 42px to 44px if device testing confirms the effective hit area is too small.

## References

[1]: https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html "Understanding Success Criterion 2.1.1 Keyboard"
[2]: https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html "Understanding Success Criterion 2.4.7 Focus Visible"
[3]: https://www.w3.org/WAI/WCAG21/Understanding/reflow.html "Understanding Success Criterion 1.4.10 Reflow"
[4]: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html "Understanding Success Criterion 1.4.3 Contrast Minimum"
[5]: https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html "Understanding Success Criterion 4.1.2 Name, Role, Value"
