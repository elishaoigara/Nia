# Nia — Launch Checklist (owner-sign-off required)

Sources: `docs/PRODUCTION_RELEASE_ASSESSMENT.md` launch blockers + marketing readiness. **No paid spend until Section A is 100%.**

## A. Technical gates (from the production assessment — owner action required)

- [ ] Apply reviewed Supabase migrations to staging → advisor + authorization checks → promote to production
- [ ] Supabase schema types generated & compared in CI (no type drift)
- [ ] Production secrets configured and rotated (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.)
- [ ] Distributed rate limiting + abuse controls: auth, AI caption/translation, messaging, uploads
- [ ] Structured error reporting, logs, uptime monitoring, actionable alerts
- [ ] Point-in-time recovery enabled, retention defined, **restore drill performed**
- [ ] Custom domain + TLS + transactional email + Supabase Auth redirect allowlist
- [ ] Accessibility, browser matrix, low-end Android, metered-network acceptance tests done
- [ ] CI workflow installed (`.github/workflows/ci.yml` from `docs/ci.yml.example`)

## B. Policy & trust gates

- [ ] Privacy policy, Terms, cookie/consent notice published
- [ ] Community guidelines + moderation policy published (linked from signup)
- [ ] Account deletion + data export flows verified
- [ ] Reporting → appeals flow tested end-to-end (already built in-app)
- [ ] Moderator rota staffed: 2 people, 12h/day coverage, escalation path named
- [ ] Safety response templates drafted (harassment, minors, scams, illegal content)

## C. Launch assets (this kit)

- [ ] Landing page live (`app/welcome/page.tsx`) with signup CTA + UTM tracking
- [ ] OG image / social unfurl verified on WhatsApp, X, IG, Telegram
- [ ] Press kit complete (`06-PRESS-KIT.md` §6) + press alias live
- [ ] Ad accounts: Meta Business, TikTok, Google — pixel/events installed, audiences built (interests + lookalikes from Founding 500)
- [ ] 16 ad variants produced (4 personas × 2 angles × 2 formats)
- [ ] Creator wave 1 signed (15–20 creators) + Spark/whitelist rights secured
- [ ] 25 seed Circles at exit-gate quality (`07` §3)
- [ ] Support inbox + in-app feedback loop staffed
- [ ] Analytics dashboards live (`08` §4) + UTM convention in every link

## D. Launch-day runbook (Day 0)

- 06:00 CAT — final smoke test: signup → onboarding → join Circle → post → DM on 3G-throttled mid-range Android
- 06:30 — moderation rota confirmed on shift; rollback path confirmed
- 07:00 — press embargo lifts; press@ monitored
- 07:05 — founder launch thread on X; reply-all mode for 4h
- 08:00 — WhatsApp/Email blast to Founding 500 ("bring 5 invites")
- 12:01 PT — Product Hunt live; maker comments answered same-hour
- 14:00 — creator wave 1 posts begin (staggered 2/hour)
- 18:00 — paid ads at 50% budget switch on (only if activation ≥ 40% on launch traffic)
- 21:00 — war-room check: errors, report queue, signup rate, CAC; go/no-go on Day-1 spend increase
- 22:00 — Day-0 numbers posted internally; transparent public numbers scheduled for Day 7

## E. Post-launch (Day 1–90)

- [ ] Weekly review ritual running (Mondays, `08` §5)
- [ ] Creative refresh every 10–14 days
- [ ] Ambassador program live in 20 campuses by Day 30
- [ ] Wave-2 markets (ZA/UG/TZ) switch on at Day 30 gate
- [ ] Referral badge rewards live by Day 22
- [ ] Francophone pilot content ready by Day 60
