# Nia — Africa Connects Here

Nia is a mobile-first, pan-African social platform with a ranked feed, Circles, Flicks, direct messages, profiles, notifications, and stories. The application is built for users on a wide range of devices and network conditions.

## Stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS 4 and CSS design tokens
- Supabase Auth, Postgres, Realtime, and Storage
- Anthropic API for caption and translation assistance
- Vitest for unit tests

## Requirements

- Node.js 22+
- npm 10+
- A Supabase project
- Provider credentials for the integrations you intend to enable

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open <http://localhost:3000>. The development server binds to `0.0.0.0`, which also supports container and remote preview environments.

Apply the checked-in Supabase schema to a linked project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The baseline migration creates tables, indexes, triggers, storage buckets, and row-level security policies. Review it against an existing project before applying it there.

## Environment

See [`.env.example`](./.env.example) for the complete list.

Required application variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Integration variables:

- `ANTHROPIC_API_KEY` and optional `ANTHROPIC_MODEL`
- `NEXT_PUBLIC_TENOR_API_KEY` (optional; static GIF fallbacks are available)

`SUPABASE_SERVICE_ROLE_KEY` is only needed by trusted local seed and test tooling. Never expose service-role or Anthropic credentials through a `NEXT_PUBLIC_` variable.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm test` | Run unit tests once |
| `npm run build` | Build the production application |
| `npm run start` | Start a production build |
| `npm run check` | Run the complete local quality gate |

A CI workflow template is provided at `docs/ci.yml.example`. Install it as `.github/workflows/ci.yml` using a GitHub credential with workflow permissions; it runs install, lint, type checking, tests, and a production build.

## Project structure

```text
app/                    Routes, route handlers, metadata, and error boundaries
components/             Reusable client and presentation components
lib/                    Integrations, scoring, validation, and data clients
types/                  Shared domain types
supabase/migrations/     Versioned database schema and RLS policies
scripts/                 Administrative scripts
docs/ci.yml.example     CI workflow template
```

Supabase clients are separated by trust boundary:

- `lib/supabase/client.ts`: singleton browser client
- `lib/supabase/server.ts`: request-scoped cookie-aware server client
- `lib/supabase/middleware.ts`: session refresh and route authorization

## Deployment

A multi-stage, non-root Docker image is included. Public Next.js variables must be supplied while building because they are compiled into the browser bundle.

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://nia.example \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY \
  -t nia .

docker run --env-file .env.production -p 3000:3000 nia
```

Before production rollout, complete the operational checklist in [`docs/PRODUCTION_READINESS.md`](./docs/PRODUCTION_READINESS.md).

## Security

- Protected routes are enforced in `proxy.ts`, with defense-in-depth authentication in sensitive route handlers.
- Database access is restricted through row-level security.
- Security headers and a Content Security Policy are configured globally.
- API inputs are length- and shape-validated; provider errors are not returned to clients.
- `npm audit` is expected to report zero known vulnerabilities.

Report security issues privately to the project maintainers rather than opening a public issue.
