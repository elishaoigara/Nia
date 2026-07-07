This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Nia — Africa Connects Here

> **Pan-African social platform.** Feed + Circles (communities) + Flicks (short video) + DMs —
> built for African youth, roughly **18–35**, mobile-first, on a mix of Kenyan/African tech stacks
> (Supabase, M-Pesa) and often on metered data.

This README covers the app as a whole. For the messaging feature specifically, see
[`components/messages/README.md`](./components/messages/README.md).

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Backend | Supabase — Postgres, Auth, Realtime, Storage |
| Styling | Tailwind v4 + CSS custom properties (theme tokens in `app/globals.css`) — some newer areas use inline `style={}` with the same tokens, see each folder's conventions |
| AI features | Anthropic API (Claude) — caption suggestions, Swahili↔English translation |
| Payments | M-Pesa Daraja API (STK Push) for local payments; manual/Flutterwave-style flow for verification |
| Search | `fuse.js` (fuzzy client-side search) |

Routing note: middleware here is named `proxy.ts` (not the Next.js-default `middleware.ts`) —
see [§5 Auth & routing](#5-auth--routing) for why, and don't rename it back.

---

## 2. Feature map

| Area | Path | What it is |
|---|---|---|
| **Feed** | `app/page.tsx` | Home timeline. Tabs: *Africa* (everyone), *Local* (same country), *Following*. Ranked by `lib/feed-scorer.ts` |
| **Circles** | `app/circles/`, `components/CreateCircle.tsx`, `CircleCard.tsx` | Topic/community groups users can join and post into |
| **Flicks** | `app/flicks/`, `FlicksClient.tsx` | Short-form vertical video (TikTok/Reels-style), ranked by `lib/flicks-scorer.ts`, tagged with a fixed taxonomy (`lib/video-categories.ts`) |
| **Messages (DMs)** | `app/messages/`, `components/messages/` | 1:1 chat — see its own README |
| **Explore** | `app/explore/` | Discovery — people/content search |
| **Notifications** | `app/notifications/` | Likes, comments, follows, mentions, etc. |
| **Profile** | `app/profile/` | View/edit profile, verification flow (`profile/verify`) |
| **Posts** | `app/posts/[id]`, `components/PostCard.tsx`, `CommentThread.tsx`, `ReplyBar.tsx` | Single post view + comments |
| **Bookmarks** | `app/bookmarks/` | Saved posts |
| **Tags** | `app/tags/[tag]` | Hashtag browsing |
| **Stories** | `components/StoriesBar.tsx` | Ephemeral stories bar on the feed |
| **Onboarding** | `app/onboarding/` | First-run profile setup (country, language, etc. — feeds directly into the ranking algorithms) |
| **Auth** | `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password`, `app/auth/callback` | Supabase email auth |

### AI-assisted API routes (`app/api/`)
| Route | Purpose |
|---|---|
| `api/caption` | Suggests an improved post caption via Claude, tuned to sound like real campus/youth voice (light local slang, no hashtags, <200 chars) |
| `api/translate` | Swahili ↔ English translation via Claude |
| `api/feed` | Server-side feed helper endpoint |
| `api/mpesa`, `api/mpesa/callback` | M-Pesa STK Push (Daraja API) — initiate + webhook callback |
| `api/verify` | Records a verification payment intent (manual/pending review — swap for real Flutterwave/Stripe verification in production) |

---

## 3. Ranking algorithms

Two independent scorers, both loosely modeled on X's open-sourced ranking approach but tuned
for a pan-African, multi-language, multi-country audience:

- **`lib/feed-scorer.ts`** — text/image/video post feed. Weights engagement (comments weighted
  highest), applies age decay, boosts in-network + same-language + same-country content, and
  decays repeated-author flooding with a floor so no author's score hits zero.
- **`lib/flicks-scorer.ts`** — short-video feed. Same shape, but **completion rate and watch
  time** replace like-weight as the dominant signals, and content ages out faster (`age_gravity`
  is higher — video relevance decays quicker than a text post).

Both hard-filter blocked/muted authors to a score of `0` rather than just deprioritizing them.

If you touch either scorer, keep the weight tables (`W` / `FLICKS_WEIGHTS`) as the single place
values live — don't inline new magic numbers elsewhere.

---

## 4. Data layer

Supabase client setup lives in `lib/supabase/`:
- `client.ts` — browser client (client components)
- `server.ts` — server client (server components / route handlers)
- `middleware.ts` — session refresh, called from `proxy.ts`

Region/locale reference data (country list, flags, regions grouped by East/West/etc. Africa) is
centralized in `lib/african-data.ts` — reuse this rather than redefining country lists anywhere
(onboarding, profile edit, and the feed's "Local" tab all read from it).

No SQL migrations are checked into this repo yet — table shape is currently only documented
inline in the code that uses it (e.g. see `components/messages/README.md §3` for the messaging
tables). If you add a migrations folder, this is the place to link it from.

---

## 5. Auth & routing

- `proxy.ts` is this project's Next.js middleware — **it's deliberately not named
  `middleware.ts`** (check `AGENTS.md`/local Next.js docs in `node_modules/next/dist/docs/`
  before assuming standard Next.js conventions apply here; this fork has intentional deviations).
- `publicPaths` in `proxy.ts` (`/login`, `/signup`, `/auth/callback`, `/onboarding`) are the only
  routes reachable without a session; everything else runs through `updateSession`.
- New users are routed to `/onboarding` until a `profiles` row exists for them (see the
  `profileCheck` redirect in `app/page.tsx`).
- `lib/app-url.ts` is the single source of truth for the canonical app URL used in auth
  redirects — set `NEXT_PUBLIC_APP_URL` in production rather than relying on the Vercel/window
  fallbacks.

---

## 6. Environment variables

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything | Standard Supabase client config |
| `NEXT_PUBLIC_APP_URL` | `lib/app-url.ts` | No trailing slash. Set explicitly in production |
| `ANTHROPIC_API_KEY` | `api/caption`, `api/translate` | Server-side only, never exposed to the client |
| `NEXT_PUBLIC_TENOR_API_KEY` | GIF picker (messages) | Falls back to a small static GIF set if unset |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | `api/mpesa` | Daraja OAuth |
| `MPESA_SHORTCODE` / `MPESA_PASSKEY` | `api/mpesa` | STK Push request signing |

Copy these into a local `.env.local` (not committed) before running `npm run dev`.

---

## 7. Getting started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build      # production build
npm run lint
```

Requires a Supabase project with matching tables/buckets already created (see §4 and the
messages README for the schema this code assumes) plus the env vars in §6.

---

## 8. Design principles

Built for **African youth, 18–35** — mobile-first, often on metered data, spanning many
countries and languages within the same friend group. This should keep shaping decisions
app-wide, not just in messaging:

- **Optimistic UI over spinners** wherever a network round-trip is in the critical path (posting,
  sending, reacting) — instant local feedback, reconciled after the request completes.
- **Don't assume one language or one country** — the feed, onboarding, and profile all key off
  `country`/`language` fields; new features should read from `lib/african-data.ts` rather than
  hardcoding assumptions.
- **Low-data-conscious media handling** — lazy/deferred loading for anything heavy (video,
  images, GIF previews) rather than eager full-resolution loads.
- **Local payment rails matter** — M-Pesa isn't a nice-to-have here, it's a primary payment path;
  don't treat it as a secondary/legacy integration.

---

## 9. Sub-project docs

- [`components/messages/README.md`](./components/messages/README.md) — messaging feature deep-dive
  (schema, realtime wiring, UX constants, roadmap)

If you build out a similarly complex area (Flicks, Circles), add a README next to it and link it
here rather than growing this file indefinitely.