# Supabase-backed Playwright tests

The database-backed tests in `e2e/fixtures/supabase.ts` create disposable Supabase Auth users, profiles, Circles, messages, and notifications for each test. The fixture deletes dependent rows first and then deletes the Auth users, allowing foreign-key cascades to remove the profiles safely.

## Required environment

Use a local Supabase project by default:

```bash
supabase start
export E2E_SUPABASE_URL=http://127.0.0.1:54321
export E2E_SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY=//p')"
export E2E_ALLOW_REMOTE=false
```

Apply the repository migrations before running the database tests:

```bash
supabase db reset
```

For an isolated staging project only, set `E2E_SUPABASE_URL` to the staging URL, provide the staging service-role key, and explicitly set `E2E_ALLOW_REMOTE=true`. Never point these tests at production. The fixture refuses remote mutation unless that explicit opt-in is present.

Run all browser projects:

```bash
npm run e2e
```

Run only the public mobile recovery tests without database credentials:

```bash
PLAYWRIGHT_BASE_URL=https://nia-rho.vercel.app \
npm run e2e -- --project=mobile-390 --grep "mobile authentication"
```

## Test isolation

Each database-backed test receives a unique email, username, Circle slug, and message content. The fixture creates the onboarding user without a profile so the real callback redirects to onboarding. It creates sender and recipient profiles plus three recommendation Circles. Cleanup removes notifications, messages, message requests, Circle memberships, Circle join requests, Circles, and Auth users in dependency-safe order.

The service-role key is used only by the Playwright fixture process and is never exposed to the browser. Browser sessions continue to authenticate through the normal user-facing login form, so the test covers the same auth and RLS paths as a real user.

If a test is interrupted, rerun the cleanup query in the local project or use a dedicated staging project with a short retention policy. Do not add fixture credentials to Git or `.env.example` beyond empty variable names.
