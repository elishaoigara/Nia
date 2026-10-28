# Nia Design and Usability Assessment

## Executive conclusion

Nia already has a stronger product thesis than a generic social feed. The codebase consistently expresses a warm, communal direction through Circles, goals, interests, regional identity, structured contributions, resources, moderation, messaging, and realtime presence. The main opportunity is not to add more features. It is to make the existing purpose **more visible, more emotionally compelling, and easier to act on within the first 30 seconds of every session**.

The current experience is attractive in a calm, branded way, but it sometimes feels like a polished social network with community features layered into it. To become unmistakably Nia, the interface should make a member’s **purpose, Circle participation, contribution, and next useful action** more prominent than trends, generic people discovery, or passive content consumption.

> **Design direction:** Make Nia feel like the place where a young African person finds people to build with, not another place to perform for attention.

## What is already working

| Strength | Evidence in the codebase | Why it matters |
|---|---|---|
| Clear visual identity | Warm parchment surfaces, charcoal text, deep violet accent, rounded cards, skyline identity art | Nia avoids the interchangeable black-and-white social-app look while remaining readable and calm. |
| Purpose-led onboarding | `app/onboarding/page.tsx` collects goals, interests, country, city, and initial Circle choices | The system gathers useful context instead of treating the user as an engagement profile only. |
| Regional identity | African country list, flags, region filters, city skylines, local Circles | Members can see themselves in the platform without reducing identity to a decorative flag. |
| Circle-centered infrastructure | Home rail, Explore recommendations, Circle prompts, resources, structured responses, moderation | The product has the foundation for meaningful community participation. |
| Accessible interaction primitives | Shared `.btn-primary`, `.btn-ghost`, `.input`, focus-visible states, 44px control target | The design system is coherent and mobile-aware. |
| Trust and safety direction | Reporting, moderation queue, membership gates, message requests, RLS hardening | Community growth is being designed with safety rather than added afterward. |

## Main design diagnosis

### 1. Nia’s strongest idea is not yet the dominant visual hierarchy

The Home route loads Stories, a combined Circle/Flicks rail, feed tabs, and a generic post composer before the main content begins (`app/page.tsx`). The implementation is already consciously reducing the number of stacked rails, but the first impression can still read as “content feed plus Circles” rather than “my community workspace.” The Home rail also defaults to **Trending** when Flicks exist (`components/HomeRail.tsx`), which gives passive video discovery priority over a member’s Circles.

**Recommendation:** Default Home to **Your Circles** whenever a member belongs to at least one Circle. Replace the current first-screen hierarchy with a compact “Today in your Circles” summary: one active prompt, one unanswered request, one useful resource, and one suggested next action. Keep Flicks available as a secondary discovery mode, not the first emotional cue.

### 2. Explore is useful but too dense and too close to a discovery marketplace

The Explore route stacks regional filters, trending hashtags, trending Circles, personalized Circles, local Circles, people to meet, and region cards. Each section is individually reasonable, but on a phone the page becomes a long sequence of recommendation modules. The first sections include “Trending in Africa” and hashtags before purpose-led Circles, which can pull Nia toward the attention-driven grammar the product is trying to avoid.

**Recommendation:** Reframe Explore around three explicit jobs:

1. **Find a Circle** — the primary destination, with purpose, activity level, location, and member fit.
2. **Find an opportunity** — resources, events, calls for collaborators, and shared projects.
3. **Meet people to build with** — people shown with a reason for connection, such as “both interested in community tech” or “looking for collaborators.”

Move hashtags into a quiet secondary area called “Conversations people are having.” Replace the current long vertical stack with a progressive layout: one primary recommendation, a horizontal “because you chose…” shelf, and clear “See all” links.

### 3. Onboarding collects good information but asks for too much before delivering value

The four-step onboarding flow is thoughtful: profile, location, interests and goals, then Circles. However, it requires a full name, username, country, at least one goal, at least three interests, and a profile before the member reaches the recommendation step. The “Pick your flag” language is warm, but the country grid and the required selections can feel like setup work before the member understands what Nia will give them.

**Recommendation:** Show value earlier. After the user selects one goal and two interests, present a preview card such as “Here are three spaces you could enter today.” Let the member choose a Circle first, then complete optional profile details afterward. Keep country and city useful for recommendations, but make city optional and explain the benefit in plain language: “This helps us find nearby opportunities; you can change it later.”

The onboarding should also offer a visible **Skip for now** path for bio, city, and interests while retaining a clear minimum for recommendations. Avoid making the user feel that a blank bio means they have failed setup.

### 4. Profile pages are visually distinctive but over-index on presentation

The profile route has the richest brand treatment in the app: city skyline art, avatar, country badge, goals, interests, profile strength, and tabs. This is a good foundation for identity and belonging. The risk is that the profile becomes a personal showcase rather than a useful bridge into community. A viewer needs to understand quickly what the person is interested in, what they are working on, what help they offer, and which Circles they share.

**Recommendation:** Add a compact **“What I’m building / learning / open to”** block above the post tabs. Make goals actionable: “Open to collaborators,” “Can help with brand design,” or “Looking for a study group.” Add shared-context labels on profile actions: “Message about a shared Circle” or “Invite to a project.” Show mutual Circles prominently, because shared context lowers social risk and makes a connection feel purposeful.

### 5. The language is warm, but some labels remain generic social-media vocabulary

Nia already uses strong phrases such as “What can we add together?” and “Resources for the journey.” Other areas still use familiar labels: **Trending**, **Following**, **Local**, **Flicks**, **New Post**, and **People to meet**. These are understandable, but they do not always communicate Nia’s difference.

**Recommendation:** Preserve familiar navigation where it reduces confusion, but add purposeful supporting copy:

| Current label | Better Nia framing |
|---|---|
| Trending | Conversations gaining energy |
| Following | People I’m learning with |
| Local | Near me |
| People to meet | People I could build with |
| New Post | Share something useful |
| Create a post | Ask, offer, update, or share |
| Your Circles | Spaces I’m part of |
| Search | Find people, Circles, or opportunities |

The goal is not to make every label poetic. It is to make the next action obvious and consistent with the product promise.

## Priority improvements

### P0 — Make the first session unmistakably Nia

| Change | Outcome | Main areas |
|---|---|---|
| Add a first-session “Your next step” card | New members understand what to do after onboarding | Home, onboarding |
| Default Home to Circles rather than Trending when Circles exist | Product thesis becomes visible immediately | `HomeRail.tsx`, `app/page.tsx` |
| Add a Circle activity summary | Members return for purposeful progress, not only new posts | Home, Circle detail |
| Make the composer purpose-led | Posts become questions, offers, updates, opportunities, or reflections | `CreatePost.tsx` |
| Add clear “why this is recommended” explanations | Recommendations feel useful rather than algorithmic | Explore, Home, Circle cards |

### P1 — Improve discovery and belonging

| Change | Outcome | Main areas |
|---|---|---|
| Redesign Explore around Circles, opportunities, and collaborators | Less clutter and stronger differentiation | `app/explore/page.tsx` |
| Show mutual Circles and shared interests on people cards | Safer, more meaningful connection | Explore, profile |
| Add Circle activity indicators | Members can choose active spaces instead of abandoned ones | Circle cards, Circles index |
| Add “new member welcome” and “introduce yourself” states | Joining a Circle feels socially navigable | Circle detail |
| Add shared resource and opportunity affordances to Home | Community value is visible without entering every Circle | Home rail, Home summary |

### P1 — Improve mobile usability and low-data confidence

| Change | Outcome | Main areas |
|---|---|---|
| Add connection-aware states | Members understand whether content is loading, live, stale, or offline | Notifications, messaging, Circle responses |
| Prefer skeletons over blank loading gaps | Layout feels stable and trustworthy | Home, Explore, profile |
| Provide media-data labels and optional autoplay controls | Better fit for metered networks | Flicks, Stories, posts |
| Add “Save for later” and shareable lightweight resource cards | Useful information remains accessible without repeated loading | Resources, posts |
| Test at 320px with large text and long names | Prevent African names, Circle names, and translated labels from breaking layout | All core routes |

### P1 — Make interaction safer and more culturally legible

| Change | Outcome | Main areas |
|---|---|---|
| Add context before messaging unfamiliar members | Reduces fear and spam | Profile, messages |
| Make message requests explain why they were received | Increases trust and acceptance | Messages |
| Add clear report outcomes and expected response times | Builds confidence in moderation | Reports, moderation |
| Support language preference beyond a single language field | Makes regional inclusion tangible | Onboarding, profile, settings |
| Add community norms at Circle entry | Gives members a shared behavioral contract | Circle join flow |

### P2 — Increase emotional quality and distinctive polish

| Change | Outcome | Main areas |
|---|---|---|
| Replace generic empty states with invitation states | A quiet product still feels alive | Home, Explore, Messages, Circle detail |
| Add subtle member milestones | Growth is recognized without gamification pressure | Profile, Circle activity |
| Introduce warm, non-infantile illustration moments | Stronger brand memory and emotional character | Onboarding, empty states |
| Add richer Circle cover identity | Circles become places with character, not only cards | Circle index/detail |
| Establish a small content-writing system | Tone remains consistent across the platform | All user-facing copy |

## Recommended Home redesign

The highest-leverage design change is the first Home viewport. A recommended structure is:

1. **Header:** “Good morning, [name]” plus a small status such as “2 Circles active today.”
2. **Your next step card:** one clear action, for example “Answer the Nairobi Tech Circle prompt” or “Introduce yourself in Young Creators Kenya.”
3. **Circle activity shelf:** three compact Circle cards showing latest prompt, active members, and last activity.
4. **Useful contributions:** a horizontal shelf for resources, opportunities, or progress updates.
5. **Share something useful:** composer with explicit modes: Ask, Offer, Update, Opportunity, Reflection.
6. **Community feed:** posts from joined Circles and followed people, ranked by relevance and freshness.
7. **Optional discovery:** Flicks and broader Africa content lower in the page, or accessible from Explore.

This preserves the existing feed architecture while changing the product’s emotional center of gravity.

## Recommended Circle card redesign

The current Circle card contains name, category, description, member count, privacy, and join state. Add four small signals:

| Signal | Example |
|---|---|
| Purpose | “Build portfolio projects together” |
| Activity | “Prompt answered today” |
| Fit | “Matches 3 of your interests” |
| Social proof | “4 people you follow are here” |

Keep the card compact. The point is not to add more text; it is to make the decision to join feel informed and human.

## Recommended composer redesign

The current composer is a conventional post entry point. It should become a community contribution tool. Use a compact segmented choice before the text field:

> **Ask** · **Offer help** · **Progress update** · **Opportunity** · **Reflection**

Each mode changes the placeholder and suggested structure. For example:

| Mode | Placeholder |
|---|---|
| Ask | “What are you trying to figure out?” |
| Offer help | “What can you help someone with?” |
| Progress update | “What moved forward this week?” |
| Opportunity | “What opportunity should the community know about?” |
| Reflection | “What did you learn or notice?” |

This turns posting from self-broadcasting into a visible act of contribution.

## Accessibility and inclusion checks

The design system has a good baseline, but the next audit should explicitly test long names, long Circle titles, translated copy, high zoom, screen readers, keyboard navigation, reduced motion, 320px width, and poor network conditions. Several current controls use placeholder-driven forms, compact 10–13px labels, emoji category markers, and dense horizontal rails. These can look good in a normal viewport while becoming difficult to use under real mobile constraints.

Prioritize visible labels for important fields, larger text for secondary metadata, strong focus states on every custom button, and alternatives to color or emoji alone. Keep the warm visual identity, but ensure that an icon, flag, color, or skyline is never the only way to understand meaning.

## Product metrics worth measuring

Avoid optimizing for raw time spent or endless scrolling. Measure whether Nia helps people do meaningful things:

| Metric | Why it matters |
|---|---|
| Time from signup to first Circle join | Measures whether onboarding creates belonging quickly |
| Percentage of new members completing one purposeful action | Measures activation beyond profile completion |
| Weekly active Circles | Measures whether communities are alive, not just registered |
| Prompt response rate | Measures useful participation |
| Resource saves and opportunity follow-through | Measures practical value |
| Meaningful conversations started | Measures quality of connection |
| Report resolution time and repeat-offender rate | Measures trust and safety |
| Returning members with a next-step action | Measures habit built around growth rather than consumption |

## Suggested implementation roadmap

### Sprint 1: Clarify the first session

Redesign onboarding completion, add the first-session next-step card, default Home to Circles, and rewrite the composer labels. Validate with five to eight target users across at least three African countries or diaspora contexts.

### Sprint 2: Rebuild discovery hierarchy

Simplify Explore into Circles, opportunities, and collaborators. Add recommendation reasons, activity signals, mutual Circles, and better empty states. Validate whether users can find a relevant Circle in under one minute.

### Sprint 3: Strengthen Circle participation

Add Circle entry norms, introductions, activity summaries, prompt status, and lightweight resource/opportunity surfacing on Home. Validate whether a new member knows how to participate without needing another person to explain the product.

### Sprint 4: Low-data, accessibility, and trust polish

Add connection-aware states, media controls, offline-friendly resource behavior, screen-reader labels, large-text testing, long-content testing, moderation feedback, and language preference improvements.

## Final recommendation

Do not make Nia more attractive by adding more visual stimulation. Make it more attractive by making the community feel **alive, relevant, and safe**. A member should open the app and immediately see where they belong, what is happening there, and one useful thing they can do. That is the design advantage available to Nia—and it is already present in the codebase; it needs to become the primary hierarchy.
