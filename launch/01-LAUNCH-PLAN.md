# Nia Web App Launch Plan
**"Africa Connects Here" — Launch window: T-4 weeks to Day 90**

> Product truth (from this repo): Nia is a mobile-first, pan-African social PWA — ranked feed, Circles (purpose-led communities), Flicks (short video), Stories, DMs, opportunities & events, creator tools, built-in moderation and safety, AI-assisted captions/translation (English, Swahili, French, Arabic, Portuguese). Brand: deep violet `#5B21B6` → `#7C3AED`, warm off-white / near-black surfaces.

---

## 1. Launch thesis

Nia does not out-TikTok TikTok. It wins on the gap young Africans openly complain about: **social media that scatters you instead of building you up.** The launch message is the one already in the deck: *"Building together, not scrolling together."*

**Launch goal (Day 90):**
- 25,000 verified signups
- 8,000 weekly active members (≥3 sessions/week)
- 150 living Circles (≥20 members, ≥3 posts/week)
- ≥40% of signups completing onboarding + joining a Circle (the activation moment)
- CAC ≤ $0.60 blended; ≥30% of growth from organic/referral by Day 90

## 2. Audience & beachhead markets

Primary: African youth **18–35**, mobile-first, data-conscious, WhatsApp-native, on TikTok/Instagram daily.

| Wave | Markets | Why |
|---|---|---|
| 1 (Pilot + Launch) | **Kenya, Nigeria, Ghana** | English+Swahili coverage, huge youth digital bases (Nigeria ~109M online; Kenya ~95–97% of internet users on WhatsApp), strong campus culture, creator economies |
| 2 (Day 30–60) | **South Africa, Uganda, Tanzania** | English/Swahili expansion; SA has 26.7M social users, TikTok at ~77% |
| 3 (Day 60–90) | **Rwanda, Zambia, Zimbabwe** + Francophone pilot (Côte d'Ivoire, Senegal) | App already supports French/Portuguese/Arabic via translation layer |

**Four personas** (detail in `02-MESSAGING-AND-POSITIONING.md`): The Hustler (career/opportunities), The Creator (Flicks/culture), The Connector (friendship/diaspora), The Learner (skills/education).

## 3. Phases

### Phase 0 — Foundation (T-4 → T-3 weeks)
*Close the gates listed in `docs/PRODUCTION_RELEASE_ASSESSMENT.md` before spending a shilling on ads:*
- [ ] Production Supabase migrations applied + advisor checks; secrets rotated
- [ ] Rate limiting + abuse controls on auth, AI, messaging, uploads
- [ ] Error reporting, uptime monitoring, alerts; backup + restore drill done
- [ ] Custom domain + TLS + transactional email + auth redirect allowlist
- [ ] Privacy, Terms, community guidelines, account-deletion policy published
- [ ] Landing page live at `/welcome` (built — see `app/welcome/page.tsx`) with UTM-tracked signup CTA
- [ ] Analytics + UTM convention live (`08-METRICS-AND-KPIS.md`)
- [ ] Support inbox + moderation rota staffed (2 people minimum, 12h/day coverage)
- [ ] Seed content: 25 Circles created and pre-populated (`07-COMMUNITY-SEEDING.md`)

### Phase 1 — Closed pilot "Founding 500" (T-3 → T-1 weeks)
- Invite **500 hand-picked users**: campus leaders, creators, community builders from seed markets. Give them a **Founding Member badge** (profile flair exists in the fun-layer work).
- Run **weekly live Circles**: AMA with a founder, "Show what you made Friday", opportunities drop.
- Fix what breaks. Exit criteria: D7 retention ≥ 25%, zero unresolved safety incidents, activation ≥ 40%.
- Collect 10 real testimonials + 5 creator demo videos (these become launch ads).

### Phase 2 — Launch week (Day 0–7) — "Africa Connects Here"
- **Day 0 (Tuesday):** Product Hunt + press embargo lifts + founder thread on X + email/WhatsApp blast to pilot. Founding-500 members each get 5 invites.
- **Day 1–2:** Creator wave 1 posts go live (15–20 creators, brief in `05-INFLUENCER-AND-AMBASSADORS.md`).
- **Day 3:** Paid ads switch on (Meta + TikTok) at 50% budget while organic peaks.
- **Day 5:** First "Circle of the Week" spotlight + opportunities drop (scholarships/gigs — the retention hook).
- **Day 7:** Publish transparent launch numbers (signups, Circles, countries) — trust is the brand.
- Follow `04-CONTENT-CALENDAR.md` day-by-day; ad copy from `03-AD-COPY-LIBRARY.md`.

### Phase 3 — Growth engine (Day 8–90)
- Scale what worked in launch week; kill what didn't (weekly review ritual in `08`).
- **Ambassador program** goes live in 20 universities (`05`, `07`).
- **Referral:** invite-a-friend with mutual reward (Founding-style badge tier for 5 invites).
- Wave 2/3 markets switch on as localization content (Swahili/French) is ready.
- Monthly "Nia Made This" campaign: spotlight a member who got a job, deal, or audience through a Circle.

## 4. Channel strategy & budget

Example budget: **$6,000/month** (scale linearly if CPA holds).

| Channel | Share | $/mo | Role |
|---|---|---|---|
| Meta (IG + FB) ads | 30% | 1,800 | Volume installs/signups; interest + lookalike targeting; lead with Circles & opportunities |
| TikTok ads + Spark Ads | 25% | 1,500 | 18–27 reach; creator UGC as ads (Spark); Flicks demos |
| Creators/influencers | 20% | 1,200 | 25–40 micro/nano creators per month, performance bonus |
| WhatsApp communities + referral | 10% | 600 | Shareable Circle links, invite rewards, community drops |
| X + organic social | 5% | 300 | Founder voice, launch moments, press amplification |
| Google Search + YouTube bumpers | 5% | 300 | Catch demand: "african community app", competitor terms |
| Campus activations | 5% | 300 | 2 flagship campus events/month in wave-1 markets |

**Why WhatsApp is a channel, not an afterthought:** ~95–98% of internet users in Nigeria/Kenya are on WhatsApp — Nia's share-and-invite loop must feel native there (Circle invite links that unfurl with OG images; WhatsApp-status-sized creatives).

**Data-conscious creative rule:** every ad asset ships with a static fallback; landing page must be < 200 KB on 3G; offer "Install app" PWA prompt (manifest is already in the repo).

## 5. KPI gates between phases

| Gate | Metric | Target | If missed |
|---|---|---|---|
| Pilot → Launch | D7 retention | ≥ 25% | Fix onboarding/Circle recs; delay launch max 2 weeks |
| Launch week | Signup → Circle join | ≥ 40% | Rework onboarding Circle step; push prompts |
| Day 30 | Blended CAC | ≤ $0.60 | Reallocate to best channel; increase creator mix |
| Day 60 | Organic+referral share | ≥ 25% | Strengthen referral rewards, ambassador program |
| Day 90 | WAU/MAU | ≥ 35% | Double down on Circles events & opportunities cadence |

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Empty-room problem (new user sees dead feed) | Seed 25 Circles + Founding 500 before any paid spend; geo-order launch by wave |
| Moderation incident during launch | Rota staffed 12h/day; report→appeal flow already built in-app; pre-written response templates |
| Data costs deter signups | Static-first landing page, low-res-first media, "works on any phone" messaging |
| Copycat positioning ("another social app") | Lead every asset with Circles + opportunities, never with "feed"; show outcomes (jobs found, skills learned) |
| Infra limits (assessment blockers) | Hard gate: no paid spend until Phase 0 checklist is 100% |

## 7. Team roles for launch (minimum viable)

- **Founder** — face of launch: X threads, AMAs, Product Hunt, press
- **Community lead** — Circles, moderators, ambassadors, WhatsApp groups
- **Growth marketer** — paid channels, UTMs, weekly numbers review
- **Content/creative** — 3–5 assets/day across channels (calendar in `04`)
- **Support on-call** — inbox, store/PWA install issues, safety escalations

---
*Companion files: messaging (`02`), ad copy (`03`), calendar (`04`), creators (`05`), press (`06`), seeding (`07`), metrics (`08`), checklist (`09`), assets (`assets/`).*
