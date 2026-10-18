# Nia Key Features Redesign Blueprint

## Design goal

Nia should feel like a **shared place to make progress with other people**, not a collection of feed, video, profile, and messaging surfaces. Every key feature should answer three questions immediately:

1. **Why is this relevant to me?**
2. **Who am I connected to here?**
3. **What useful thing can I do next?**

The redesign keeps the existing warm parchment and violet visual language, but shifts hierarchy away from passive consumption and toward Circle participation, opportunities, and meaningful contribution.

> **Core principle:** Replace “What is popular?” with “What can we do together?”

---

# 1. Cross-feature experience direction

| Feature | Current role | Redesigned role | Primary action |
|---|---|---|---|
| Home | Feed with Circle and Flicks rails | Personal community dashboard | Continue something meaningful |
| Circles | Community spaces | Main product object and progress spaces | Join, contribute, or help |
| Explore | Discovery hub with many stacked sections | Purpose-based directory | Find a Circle, opportunity, or collaborator |
| Flicks | Short/long video consumption | Useful visual knowledge and story layer | Watch, save, discuss, or apply |
| Messages | Direct communication | Trusted relationship layer | Continue a shared conversation |
| Profile | Identity and post history | “What I’m about and how I contribute” | Connect through shared context |
| Notifications | Event inbox | Community action queue | Respond to something that needs you |
| Moderation | Admin queue | Trust and safety operations | Resolve harm and protect participation |

## Visual language

Use the existing parchment, charcoal, and violet foundation, but introduce a small set of **purpose states**:

| State | Visual treatment | Meaning |
|---|---|---|
| Active | Violet tint and filled icon | Something is currently happening |
| Needs response | Soft coral edge or dot | A contribution or request needs attention |
| Useful | Mint-tinted neutral surface | Resource, opportunity, or completed progress |
| Local | Warm amber detail used sparingly | Nearby or regional relevance |
| Quiet | Neutral surface with muted metadata | Stable, low-pressure information |

Do not use color as the only signal. Pair every state with a short label such as **Needs your response**, **Active today**, or **Saved for later**.

---

# 2. Detailed Home Circle-first wireframe

## 2.1 Mobile viewport: 390px wide

```text
┌──────────────────────────────────────┐
│ Nia                         ◐  + Share│  56px top bar
├──────────────────────────────────────┤
│                                      │
│ Good morning, Amara                  │
│ 3 Circles active today                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ YOUR NEXT STEP                   │ │
│ │                                  │ │
│ │ Nairobi Tech Circle              │ │
│ │ Prompt closes in 2 days          │ │
│ │ “What are you building this week?”│ │
│ │                                  │ │
│ │ [Answer prompt]        Later      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Spaces you are part of        See all│
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│ │ ◉        │ │ ◉        │ │ +     │ │
│ │ Nairobi  │ │ Creators │ │ Find  │ │
│ │ Tech     │ │ Kenya    │ │ a     │ │
│ │ Active   │ │ 2 new    │ │ Circle│ │
│ └──────────┘ └──────────┘ └───────┘ │
│       horizontal scroll shelf        │
│                                      │
│ What is happening                   │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Nairobi Tech Circle       Active  │ │
│ │ Aisha shared a resource           │ │
│ │ “Free cloud credits for startups” │ │
│ │ 4 people saved · 2 replies        │ │
│ │                                  › │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Young Creators Kenya       3 new  │ │
│ │ Progress update from Brian        │ │
│ │ “Finished my first portfolio…”    │ │
│ │ [Encourage] [View Circle]         │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Share something useful               │
│ ┌──────────────────────────────────┐ │
│ │ Ask · Offer · Update · Opportunity│ │
│ │                                  │ │
│ │ What would you like to add?       │ │
│ │                                  │ │
│ │                         [Share]   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ From across Africa            See all│
│ ┌───────────────┐ ┌───────────────┐ │
│ │ Useful Flick  │ │ Story / idea  │ │
│ │ 02:14          │ │ from Accra   │ │
│ │ Save / discuss │ │ Save / share │ │
│ └───────────────┘ └───────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ Home  Explore  Flicks  Messages  Me  │ 64px bottom nav
└──────────────────────────────────────┘
```

## 2.2 Desktop viewport: 1440px wide

```text
┌───────────────┬───────────────────────────────┬────────────────────┐
│ NIA           │ Good morning, Amara           │ Notifications      │
│               │ 3 Circles active today        │                  ◌ │
│ Home          ├───────────────────────────────┤                    │
│ Explore       │ ┌───────────────────────────┐ │ Your Circle pulse  │
│ Flicks        │ │ YOUR NEXT STEP            │ │                    │
│ Messages      │ │ Nairobi Tech prompt       │ │ ┌────────────────┐ │
│ Me            │ │ [Answer prompt]          │ │ │ 3 active       │ │
│               │ └───────────────────────────┘ │ │ 1 needs you    │ │
│ [+ Share]     │                               │ └────────────────┘ │
│               │ Spaces I’m part of            │                    │
│               │ [Circle] [Circle] [Circle]    │ Recent activity    │
│               │                               │                    │
│               │ What is happening              │ ┌────────────────┐ │
│               │ [Activity card]               │ │ New response   │ │
│               │ [Activity card]               │ │ in Tech Circle │ │
│               │                               │ └────────────────┘ │
│               │ Share something useful         │ ┌────────────────┐ │
│               │ [Purpose composer]            │ │ Resource added │ │
│               │                               │ └────────────────┘ │
│               │ From across Africa             │                    │
│               │ [Flick] [Opportunity] [Story]  │                    │
└───────────────┴───────────────────────────────┴────────────────────┘
```

## 2.3 Home hierarchy

The first viewport should contain only one dominant action: **Answer prompt**, **Continue conversation**, or **Join a Circle**. The action is selected from current member state.

| Member state | Primary next step | Supporting text |
|---|---|---|
| New member, no Circle | Join a Circle | “Find a space connected to what you want to do.” |
| Joined, unanswered prompt | Answer prompt | “Your Circle is waiting for your perspective.” |
| Active conversation | Continue conversation | “Two people replied to your update.” |
| No active Circle activity | Discover opportunity | “Find a Circle or opportunity that matches your goals.” |
| Returning after absence | Catch up | “Here are the three things worth seeing.” |

---

# 3. Home component breakdown

## 3.1 Proposed component tree

```text
<HomePage>
  <AppShell>
    <HomeHeader>
      <Greeting />
      <ActivitySummary />
      <NotificationBell />
      <ShareButton />
    </HomeHeader>

    <HomeMain>
      <NextStepCard />
      <CircleShelf />
      <CirclePulseFeed>
        <CircleActivityCard />
        <CircleActivityCard />
        <CircleActivityCard />
      </CirclePulseFeed>
      <PurposeComposer />
      <AfricaShelf>
        <UsefulFlickCard />
        <OpportunityCard />
        <StoryCard />
      </AfricaShelf>
    </HomeMain>

    <HomeAside>
      <CirclePulseSummary />
      <UpcomingOpportunities />
      <SafetyShortcut />
    </HomeAside>
  </AppShell>
</HomePage>
```

## 3.2 Component contracts

### `HomeHeader`

**Responsibility:** Establish warmth, orientation, and lightweight status without becoming a dashboard full of metrics.

**Props:**

```ts
type HomeHeaderProps = {
  displayName: string
  activeCircleCount: number
  needsResponseCount: number
  unreadNotificationCount: number
}
```

**Behavior:** The greeting should use the member’s chosen name. “3 Circles active today” should be a sentence, not a gamified score. The notification bell remains available but should not dominate the visual hierarchy.

### `NextStepCard`

**Responsibility:** Select one useful action from the member’s current state.

**Props:**

```ts
type NextStep =
  | { type: 'join'; circle: CircleSummary }
  | { type: 'prompt'; circle: CircleSummary; prompt: CirclePrompt }
  | { type: 'reply'; circle: CircleSummary; activity: ActivitySummary }
  | { type: 'discover'; reason: string }

type NextStepCardProps = {
  step: NextStep
  onPrimaryAction: () => void
  onDismiss?: () => void
}
```

**Design:** Use a violet eyebrow label, a clear human sentence, one primary button, and an intentionally quiet Later action. Never show more than one primary action in this card.

### `CircleShelf`

**Responsibility:** Make membership visible and provide fast re-entry into Circles.

**Props:**

```ts
type CircleShelfProps = {
  circles: Array<{
    id: string
    name: string
    slug: string
    category: string | null
    activityLabel: string
    needsResponse?: boolean
  }>
  suggested?: CircleSummary[]
}
```

**Design:** Use compact identity cards rather than long pills. Each card should show Circle name, activity state, and a small purpose/category cue. “Find a Circle” is the final card, not a generic “See all” link alone.

### `CirclePulseFeed`

**Responsibility:** Replace a generic chronological feed at the top of Home with a small ranked set of meaningful Circle activity.

**Activity types:** `prompt`, `resource`, `opportunity`, `progress_update`, `question`, `welcome`.

**Design:** Each card must explain the Circle, the person, the action, and the useful next response. Avoid using like counts as the primary social proof.

### `PurposeComposer`

**Responsibility:** Help the member contribute with intention.

**Props:**

```ts
type ContributionMode = 'ask' | 'offer' | 'update' | 'opportunity' | 'reflection'

type PurposeComposerProps = {
  defaultMode?: ContributionMode
  circleOptions: CircleSummary[]
  onSubmit: (input: {
    mode: ContributionMode
    content: string
    circleId?: string
    media?: File[]
  }) => Promise<void>
}
```

**Design:** The mode selector should be visible before the text area. The default mode can be `update` inside a Circle and `ask` on the general Home surface. Mode labels should be short, with explanatory placeholders.

### `AfricaShelf`

**Responsibility:** Preserve cross-African discovery without allowing it to displace Circle participation.

**Content types:** Useful Flicks, opportunities, regional stories, resource collections, and public Circle invitations.

**Design:** Every item needs a usefulness label such as `Learn`, `Try this`, `Opportunity`, or `Hear from`. Avoid a pure “Trending” label at the top of Home.

---

# 4. Flicks redesign

## 4.1 Product position

Flicks should not be a copy of TikTok or Reels. It should be Nia’s **visual learning, storytelling, and practical inspiration layer**. The key question is not “Will this keep me scrolling?” but “Did this teach me something, show me a possibility, or help me connect with someone?”

## 4.2 Flicks information architecture

| Tab | Purpose | Example content |
|---|---|---|
| For you | Personalized useful visual content | “How I started a small design studio in Kisumu” |
| Learn | Short explainers and skills | Coding, finance basics, creative tools, language, career advice |
| Build | Projects, behind-the-scenes, collaboration | Prototype updates, maker stories, business experiments |
| Culture | Music, food, fashion, language, heritage | Local creative work and regional stories |
| Opportunities | Calls, grants, events, competitions, communities | “Apply before Friday,” “Open volunteer roles” |

Avoid calling the primary tab **Trending**. A small “Popular this week” section can exist inside Culture or For you, but should not define the experience.

## 4.3 Flick card redesign

```text
┌──────────────────────────┐
│ [poster/video]            │
│                          ◉│
│                          ││
│                          ││
│ ┌──────────────────────┐ │
│ │ LEARN · 02:14        │ │
│ │ How I found my first │ │
│ │ three design clients │ │
│ │                      │ │
│ │ @aisha · Nairobi     │ │
│ │ [Save] [Discuss]     │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

Show category, duration, title, creator location, and one practical action. Counts should be secondary. A Flick should be understandable without sound and without opening it.

## 4.4 Flick detail/player redesign

The existing player already contains useful performance controls such as slow-connection detection, limited render windows, poster placeholders, comments, volume controls, and sharing. The redesign should add:

| Addition | Purpose |
|---|---|
| “Why you’re seeing this” | Explain relevance through interest, Circle, language, or location |
| Save to a Circle | Convert passive viewing into shared learning |
| Add a useful response | Encourage reflection, question, or practical follow-up |
| Transcript / captions | Make content usable without sound and more accessible |
| Data-use indicator | Show whether the player is in data-saver mode |
| Related Circle | Connect the video to a community or project |
| “Try this” action | Turn learning into a small next step |

## 4.5 Flick interaction model

Use a vertical player for focused viewing, but insert intentional stopping points:

1. Watch or read captions.
2. See the creator’s context and why it matters.
3. Save, discuss, join related Circle, or try an action.
4. Continue only when the member chooses.

Do not automatically chain an infinite stream after every video. After three or four Flicks, show a “Choose what to explore next” sheet with Learn, Build, Culture, and Opportunities.

## 4.6 Flick creation flow

Replace a generic video upload with a short purpose form:

```text
What are you sharing?
[Teach something] [Show progress] [Tell a story] [Share an opportunity]

Title or takeaway
[What should someone remember?]

Who is this for?
[Students] [Creators] [Builders] [Job seekers] [Community leaders]

Related Circle or topic
[Choose a Circle] [Choose a topic]

[Add captions]  [Save as draft]  [Publish Flick]
```

This improves quality without demanding professional production. The emphasis is on context and usefulness rather than polish alone.

---

# 5. Redesign directions for other key features

## Circles

Make each Circle feel like a living room and a workbench. The Circle header should show purpose, current activity, member count, norms, and the next shared action. Add a lightweight “Start here” sequence for new members: read the purpose, introduce yourself, view the current prompt, and save one resource.

## Explore

Reduce the number of simultaneous sections. Start with a purpose search: “What do you want to do?” Offer `Learn`, `Build`, `Find opportunities`, `Meet collaborators`, `Share culture`, and `Support community`. Then show Circles first, people second, and public content third.

## Messages

Make direct messaging contextual. On a profile or Circle, explain the relationship: “You are both in Nairobi Tech Circle.” For unknown members, encourage a message request with a reason. Add lightweight conversation starters such as “Ask about their project” or “Offer help with a shared interest.”

## Profiles

Lead with what the person is doing and how they want to contribute. Add sections for `Building`, `Learning`, `Open to`, and `Circles`. Keep skyline identity art, but ensure it supports the person rather than taking the most visual attention.

## Notifications

Turn notifications into an action queue. Group them under `Needs your response`, `Circle activity`, `Messages`, and `Updates`. Each item should tell the member what they can do next. Avoid making every social reaction equally prominent.

## Stories

Use Stories for short-lived community moments: a Circle check-in, event preparation, a small win, or a question. Add a “Save as Circle update” option so valuable stories do not disappear entirely after 24 hours.

---

# 6. Suggested implementation slices

## Slice A: Home Circle-first foundation

Create `HomeHeader`, `NextStepCard`, `CircleShelf`, `CirclePulseFeed`, and `PurposeComposer`. Reuse existing Supabase queries where possible, but introduce a server-side `get_home_pulse` query or view so the first viewport is not assembled from many independent client requests.

## Slice B: Purposeful posting

Extend the post model or metadata to support contribution mode. Keep backward compatibility for existing posts by treating missing mode as `reflection`. Add mode-aware placeholders, labels, and filtering.

## Slice C: Flicks usefulness layer

Add category metadata, captions/transcript support, related Circle, save-to-Circle, and “Try this” action. Keep the existing slow-connection and render-window optimizations.

## Slice D: Circle pulse and activity summaries

Create a normalized activity feed for prompts, resources, responses, opportunities, and welcome events. Use this feed for Home and Circle detail rather than building separate one-off summaries.

## Slice E: Cross-feature visual QA

Test the redesign at 320px, 390px, low-end Android viewport sizes, dark mode, large text, reduced motion, long names, long Circle names, slow 3G, and no-content states. Validate that each surface has one dominant action.

---

# 7. Success criteria

| Area | Success condition |
|---|---|
| First session | A new member reaches a relevant Circle or opportunity in under one minute. |
| Home | A returning member can identify their next useful action without scrolling deeply. |
| Circles | A new member understands how to participate after reading one screen. |
| Flicks | A member can explain why a video matters and what to do with it afterward. |
| Messaging | A member understands the context and safety of a new conversation request. |
| Profiles | A visitor can see what a person is building, learning, or open to within five seconds. |
| Mobile | Core flows work at 320px width, with long names and metered-network constraints. |
| Product identity | User testing describes Nia as community- and purpose-led rather than as another feed app. |
