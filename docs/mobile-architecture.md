# Nia Mobile Architecture Decision Record

## Decision

Build the first native clients with **Expo and React Native using TypeScript**, Expo Router, Supabase Auth, Supabase Realtime, Supabase Storage, and EAS Build/Submit. Keep Next.js as the web client and the server-side boundary for privileged operations. Share domain types, validation schemas, analytics event names, feature flags, and API contracts rather than copying web components into mobile.

Expo SDK 55 and later run on React Native’s New Architecture, so the mobile project should start on a current Expo SDK and validate dependencies with `expo-doctor` before adding native packages. The official Supabase React Native quickstart uses `@supabase/supabase-js`, AsyncStorage, and `react-native-url-polyfill` for the mobile client.

## Boundaries

The mobile app should call Supabase directly for RLS-protected reads and writes such as profiles, follows, Circles, posts, reactions, notifications, and messages. Privileged operations such as AI generation, payment initiation, moderation actions, signed upload workflows, and service-role tasks must remain behind Next.js route handlers or Supabase Edge Functions. A service-role key must never ship in the mobile bundle.

The shared contract layer should contain `types/domain.ts` equivalents, Zod or equivalent validation schemas, canonical event names, recommendation response shapes, and permissions. The web and mobile clients should consume compact response shapes rather than reconstructing large nested joins independently.

## Suggested project structure

```text
apps/
  web/                 # current Next.js application
  mobile/              # Expo Router application
packages/
  domain/              # shared types, validators, event names, feature flags
  api-contracts/       # compact request/response schemas
  design-tokens/       # spacing, colors, typography, accessibility sizes
supabase/
  migrations/          # versioned database schema
  functions/           # privileged or asynchronous server workflows
```

The current repository can remain a single web project for now. Introduce a monorepo only when the mobile project begins; do not force a migration before shared code is actually needed.

## Mobile navigation and data strategy

Use tabs for Home, Explore, Circles, Messages, and Profile. Use native stack screens for post details, Circle details, profile details, notifications, onboarding, and message threads. Use deep links for `/messages/:userId`, `/circles/:slug`, `/posts/:id`, and profile routes so notification taps behave consistently across web and mobile.

Use cursor-based pagination and compact projections for Home, Explore, and Messages. Cache the most recent feed page and Circle/profile summaries locally, but treat Supabase as the source of truth. On poor connections, show cached content with a clear stale indicator, queue safe optimistic interactions, and avoid auto-downloading video or large media until the user explicitly requests it.

## Delivery sequence

First create a mobile shell with authentication, onboarding, tabs, deep links, and the shared domain package. Then implement profiles, follows, Circles, Home, and Explore. Add notifications and Realtime badge updates next. Add messaging after the shared safety controls are available. Add camera/media upload, push notifications, and offline behavior after the text-first flows are stable.

Use EAS Build for signed iOS and Android builds, EAS Submit for store submission, and separate development, preview, and production Supabase projects. Run `expo-doctor` and a device smoke test before each release candidate.
