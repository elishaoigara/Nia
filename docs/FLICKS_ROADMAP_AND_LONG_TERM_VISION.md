# Nia Flicks Roadmap and Long-Term Vision

## Product position

Flicks should be Nia’s visual culture and community layer: short moments, useful discoveries, creative expression, and deeper conversations that lead people back into Circles. It should not optimize for passive time spent or reproduce TikTok and YouTube as smaller copies.

The existing implementation already has valuable foundations: separate short and long video collections, purpose taxonomy, category metadata, comments, likes, shares, view tracking, captions/transcripts, muted autoplay, poster fallbacks, slow-connection detection, a limited decoder render window, retry states, and data-conscious media behavior. The roadmap should build on these foundations rather than replace them.

## Short-term quick wins: next 2–6 weeks

### 1. Improve discovery without making the page noisy

The first Flicks viewport should explain what is worth watching and why. Keep the existing purpose filters, but add lightweight discovery lanes above or beside the player:

| Lane | What it contains | Why it fits Nia |
| --- | --- | --- |
| For your Circles | Videos connected to joined Circles | Leads discovery back to community. |
| Around Africa | Useful or culturally interesting videos from different places | Builds regional curiosity without reducing people to country labels. |
| Try this | Videos with a practical action or prompt | Turns watching into participation. |
| Small lessons | Short explainers and lived knowledge | Supports growth without becoming a course catalogue. |
| Made here | Creative work, products, music, food, and design | Celebrates African creativity. |

Each recommendation should include a reason such as **“From Nairobi Music”**, **“Matches your design Circle”**, or **“Three people saved this for a group conversation.”** Avoid opaque “For You” ranking as the only explanation.

### 2. Make the short-video layout feel intentional

Retain the immersive vertical player for shorts, but add a compact top-level mode switch: **Short moments**, **Longer stories**, and **Saved**. On desktop, render the player in a centered stage with a stable metadata column; on mobile, keep the video full-width with a readable bottom sheet that does not collide with the action rail.

The action rail should prioritize Nia actions over generic popularity signals:

- **Send to a Circle**
- **Save**
- **Add your take**
- **Comment**
- **Share**

Likes can remain, but should not dominate the visual hierarchy. The purpose badge, creator, language, caption, and Circle connection should remain readable without opening another screen.

### 3. Add low-cost engagement micro-interactions

Use small moments that reward participation rather than consumption:

- A soft “Sent to Nairobi Music” confirmation after sharing to a Circle.
- A warm reaction stamp such as **That’s real**, **I’m trying this**, or **Tell me more**.
- A small save animation that communicates “kept for later,” not a score.
- An optional “Your version?” prompt after a Flick marked **Try this**.
- A gentle end-of-cluster message after several videos: **Want to talk about this in a Circle?**

Micro-interactions must respect reduced-motion preferences, avoid streaks and leaderboards, and never block playback or navigation.

### 4. Improve grid responsiveness for long-form video

Long-form videos should use a responsive editorial grid rather than the shorts player. Recommended behavior:

| Viewport | Layout |
| --- | --- |
| 320–639px | One-column cards with 16px side padding, 16:9 poster, title below, and metadata on two wrapped lines. |
| 640–1023px | Two-column grid with fixed aspect-ratio posters and consistent card heights. |
| 1024px and above | Three-column discovery grid plus a featured story card or editorial rail. |

Never use fixed-height title regions that clip text. Reserve space for two lines of title, one line of creator/context metadata, duration, and purpose badge. Long names and Circle titles must wrap or truncate with an accessible full-label tooltip.

### 5. Add better filters and sorting

Short-term filters should remain understandable:

- Purpose: **Questions, Offers, Progress, Pass it on, Reflections**.
- Format: **Under 60 seconds, 1–5 minutes, 5+ minutes**.
- Language.
- Region, used as an optional discovery lens rather than a hard identity filter.
- Circle connection: **From my Circles**.

Add a **Fresh / Saved / From my Circles** control rather than a popularity sort. If ranking is introduced, use **Useful this week** or **Active conversation** instead of “Most viral.”

### 6. Make the creator and video context clearer

Every video card should answer: who made it, where it comes from, what it is about, and what a viewer can do next. The minimum metadata model should include:

```text
Creator · place or language
Purpose badge · category
Duration · caption availability
Connected Circle, when verified
Primary next action
```

The creator should not need to build a polished personal brand. Use a friendly profile summary and show the relevant Circle or interest context.

## Long-term vision: 3–18 months

### 1. Purpose-aware personalization

Nia’s recommendation system should personalize around intent and community value, not raw watch time. A member’s preference model can combine:

- Explicit purpose interests.
- Circles joined and conversations entered.
- Saves, shares to Circles, comments, and “Try this” actions.
- Language and regional preferences.
- Completion and replay signals, treated as supporting evidence rather than the primary objective.
- Negative feedback such as **Not for me**, **Too repetitive**, or **Not relevant**.

The system should maintain a diversity budget so one topic, creator, city, or country does not dominate the feed. It should also include a freshness budget for new and under-discovered creators.

A useful ranking objective is not “maximize session duration.” It is closer to:

```text
community usefulness
+ intentional completion
+ meaningful saves and Circle shares
+ creator diversity
+ regional and language relevance
− repetition
− negative feedback
− unsafe or low-quality content
```

The interface should explain recommendations in plain language and provide controls to reset or tune the feed. A chronological or **Fresh** mode should always remain available.

### 2. Creator practice and growth

The goal is to help creators improve useful cultural and educational work without forcing them into attention-seeking performance.

#### Creator tools

- Creator profile with portfolio, Circles, languages, and topics.
- Video series and playlists such as **Learning with me**, **Behind the work**, or **Street-level ideas**.
- Caption and transcript editor.
- Collaborative videos with Circle attribution.
- Analytics focused on saves, Circle shares, completion, and helpful responses.
- Audience feedback prompts such as **What should I explain next?**

### 3. Immersive community streaming rooms

The long-term live experience should be a **Circle room**, not a celebrity broadcast platform. A room might be a live co-working session, music listening room, community debate, skill exchange, cultural story night, or project clinic.

#### Room structure

```text
┌─────────────────────────────────────────┐
│ Live room title · Circle identity       │
│ Hosts · language · approximate duration  │
├─────────────────────────────────────────┤
│                                         │
│              live video / audio         │
│                                         │
├─────────────────────────────────────────┤
│ Prompt of the room                      │
│ [Raise hand] [Ask] [React]              │
│                                         │
│ Circle notes · shared links · resources │
└─────────────────────────────────────────┘
```

Rooms should support co-hosts, moderated questions, translated captions, text chat, hand raising, polls, shared resources, recordings with consent, and a clear end-of-room summary. The room should preserve the Circle’s identity through color, prompt, ritual, and member context.

#### Immersive but accessible

Use lightweight spatial cues—participant avatars, a shared prompt wall, reaction stamps, and live resource cards—rather than heavy 3D effects. Audio-only mode, captions, low-bitrate mode, dial-in or fallback participation where feasible, and a clear bandwidth indicator are essential for varied African connectivity conditions.

### 4. Community remix and response loops

The strongest differentiator could be turning a Flick into a shared prompt:

1. A creator posts a short idea or challenge.
2. Viewers respond with their own version, local example, or counterpoint.
3. Responses form a small thread or Circle activity cluster.
4. The creator or Circle host curates a recap.
5. The recap becomes a resource, playlist, or live discussion prompt.

This creates a loop from video to participation to knowledge, rather than video to passive scrolling.

### 5. Safety and trust at scale

Before personalization and live rooms, Nia needs stronger safety infrastructure:

- User-controlled **Not interested** and topic reset.
- Pre-publication checks for severe abuse, scams, non-consensual imagery, and dangerous misinformation.
- Human escalation and moderator tools for live rooms.
- Slow-mode chat, question queues, blocked-word controls, and host removal powers.
- Copyright and consent workflows for music, faces, and recordings.
- Appeals and transparent enforcement states.
- Age and audience controls for sensitive content.
- A separate safety event stream for auditing recommendation and moderation decisions.

## Recommended sequence

| Phase | Focus | Success signal |
| --- | --- | --- |
| 1 | Discovery lanes, responsive long-form grid, clearer metadata | More meaningful opens and fewer immediate exits. |
| 2 | Circle sharing, saves, “Try this,” reaction stamps, and feedback controls | More video-to-Circle actions and useful responses. |
| 3 | Freshness/diversity ranking and explainable personalization | Higher satisfaction without increasing unwanted repetition. |
| 4 | Creator series, analytics, and grants | More consistent quality from emerging creators. |
| 5 | Moderated Circle streaming rooms | Repeat participation, shared resources, and safe room completion. |

## Metrics that fit Nia

Avoid treating watch time as the main success measure. Track a balanced set:

- Percentage of viewers who save, share to a Circle, comment meaningfully, or choose **Try this**.
- Videos that start a Circle conversation or resource.
- Purpose-filter usage and successful purpose-aligned actions.
- Creator diversity across region, language, gender, and topic where collection is ethical and optional.
- Viewer satisfaction and **Not interested** rate.
- Repeat visits to a creator or Circle without excessive notification pressure.
- Caption usage, data-saver usage, and playback failure rate.
- Reports per thousand views and moderation response time.

## Product guardrails

Flicks should never require infinite scroll, public popularity rankings, or engagement bait to feel alive. Every major feed decision should pass three questions:

1. Does this help someone find a useful person, idea, story, or Circle?
2. Does this give the viewer a meaningful choice beyond watching longer?
3. Does this work respectfully on a low-end phone, a limited data bundle, and a mixed-language audience?

If the answer is no, the feature should be redesigned before launch.
