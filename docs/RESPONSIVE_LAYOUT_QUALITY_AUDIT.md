# Nia Responsive Layout Quality Audit

**Date:** 22 August 2026  
**Scope:** Overlaps, click interception, horizontal overflow, squeezed text, and narrow-screen reflow across primary routes

## Summary

The site-wide audit found and fixed one genuine cross-route interaction defect: the global splash layer captured pointer events during its opening animation and could block controls on auth pages. The splash is decorative, so it now always uses `pointer-events: none`.

The Circle detail page was also hardened with dedicated wrap-safe layout rules for the Conversation starter and Shared shelf sections. Prompt actions now wrap or stack, resource actions move to a separate full-width row on small screens, and long headings cannot push controls over adjacent content.

## Automated coverage

| Check | Coverage | Result |
|---|---:|---:|
| Route layout audit | 15 primary routes × 4 viewports = 60 navigations | No detected horizontal overflow, interactive collisions, or blocking high-z-index layers in rendered surfaces |
| Auth-surface early-load audit | Login, signup, forgot password, reset password × 3 viewports = 12 navigations | No horizontal overflow or blocking fixed/absolute layer after splash fix |
| Viewports | 320px, 375px, 390px, and 1440px | Covered |
| Existing browser tests | Authentication recovery and navigation checks | 4 passed; invalid-credential alert check remains environment/network-sensitive |
| Database-backed browser tests | Onboarding, messaging, concurrent sessions | Blocked because isolated `E2E_SUPABASE_URL` and `E2E_SUPABASE_SERVICE_ROLE_KEY` are not configured |
| Lint | Full repository | Passed with zero warnings |
| TypeScript | Strict project check | Passed |
| Unit tests | Full Vitest suite | 9/9 passed |
| Production build | Full Next.js build | Passed; 32 routes generated |

## Route coverage note

The unauthenticated audit intentionally did not bypass authentication. Protected routes redirected to login, so their full authenticated content was not visually inspected in this run. The audited redirect surfaces were still checked for overflow and blocking layers. A full authenticated visual pass requires an isolated disposable test account or a local seeded test environment.

## Fixes applied

### Global splash layer

`components/SplashScreen.tsx` now treats the splash as visual-only. It no longer intercepts clicks while visible, and its logo is marked decorative for assistive technology.

### Circle prompt

`components/CirclePrompt.tsx` now uses explicit header, text, composer, action-row, and action-button groups. The related CSS gives text containers a shrinkable minimum, prevents textarea width expansion, preserves a visible gap between the textarea and actions, and stacks the action buttons on narrow screens.

### Circle shared shelf

`components/CircleResources.tsx` now uses an explicit resource header and copy container. The button is non-shrinking on larger screens and becomes a separate full-width control on narrow screens, preventing it from competing with the heading or description.

## Manual follow-up

The remaining release-level check is an authenticated visual walkthrough of Home, Circles, Flicks, Messages, Settings, Profile, Notifications, Bookmarks, Moderation, and Onboarding at 320px, 375px, 390px, and desktop widths. The walkthrough should verify no clipped primary action, overlap, horizontal scroll, or control below a 44px touch target.
