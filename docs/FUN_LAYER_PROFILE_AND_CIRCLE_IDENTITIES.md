# Fun Layer: Profile Cards and Circle Room Identities

## Design intent

Nia should feel like a place where people recognize one another, not a directory of polished professional profiles. Profile cards should communicate personality and current energy in seconds. Circle identities should make each space feel like a room with its own tone, inside jokes, colors, and reasons to return.

The visual system should remain accessible, responsive, and calm. Playfulness comes from language, color, illustration, and human context—not flashing animation, public status competition, or infinite engagement mechanics.

## Playful profile card

### Card hierarchy

```text
┌──────────────────────────────────────────┐
│ avatar    Amara                     ⋯    │
│           Nairobi · she/her              │
│                                          │
│ “Currently curious about music + design” │
│                                          │
│ CURRENTLY                                │
│ [Making a playlist] [Learning React]     │
│                                          │
│ ASK ME ABOUT                             │
│ affordable recording · good food         │
│                                          │
│ Nairobi Music · Young Creators Kenya     │
│ [Say hi]                     [View profile]│
└──────────────────────────────────────────┘
```

### Content model

Use optional, user-controlled fields: `current_vibe`, `currently_doing[]`, `ask_me_about[]`, `comfort_favorite`, and `profile_color`. Keep the existing identity fields and never require a user to invent a polished personal brand. Display only the fields the member has chosen to complete.

### Component breakdown

| Component | Responsibility | Mobile behavior |
| --- | --- | --- |
| `PlayfulProfileCard` | Compose identity, vibe, current state, and Circle context | One-column card with wrapped text and no fixed-height content. |
| `ProfileAvatar` | Show avatar or initials with user-selected accent | 48px minimum visual size; descriptive alt text when meaningful. |
| `VibeLine` | Show one short human sentence | Clamp to two lines only after natural wrapping. |
| `CurrentlyChips` | Show up to three current activities | Horizontal scroll only when necessary; each chip remains touch-safe. |
| `AskMeAbout` | Show interests as conversational prompts | Hide empty section rather than showing placeholders. |
| `MutualCircles` | Show shared Circle identity | Use names and count, never only an unexplained number. |
| `ProfileCardActions` | Provide one primary action and one quiet secondary action | Stack actions below 360px; never squeeze buttons into one line. |

### Tone examples

Prefer **“Currently making a playlist for a long bus ride”** over **“Music enthusiast.”** Prefer **“Ask me about finding affordable creative tools”** over **“Skills: audio production.”** Prefer **“We both hang out in Nairobi Music”** over **“3 mutuals.”**

## Expressive Circle room identity

A Circle should feel like a recognizable room rather than a category in a database. Its identity has four layers:

1. **Purpose:** Why the room exists.
2. **Mood:** The emotional temperature of the room.
3. **Texture:** A color, pattern, illustration, or local visual cue.
4. **Ritual:** A recurring prompt, check-in, or playful activity.

### Circle room header

```text
┌──────────────────────────────────────────┐
│  [custom pattern / color band]            │
│                                          │
│  🎧 Nairobi Music                        │
│  late-night listeners and makers         │
│  128 people · conversation warming up    │
│                                          │
│  TODAY'S ROOM PROMPT                     │
│  What song is carrying you this week?   │
│                         [Join the room]  │
└──────────────────────────────────────────┘
```

### Circle identity fields

| Field | Example | Rule |
| --- | --- | --- |
| `room_tagline` | “late-night listeners and makers” | Maximum 58 characters; human, specific, and editable by trusted Circle owners. |
| `room_mood` | “conversation warming up” | Derived from activity bands, never a competitive score. |
| `room_color` | Amber-to-violet gradient | Must pass contrast checks with overlaid text. |
| `room_pattern` | Abstract waveform, bead grid, notebook marks | Use low-opacity SVG/CSS patterns; avoid stereotyped cultural motifs without context. |
| `room_ritual` | “Friday sound check” | Optional recurring prompt with a clear opt-out or mute behavior. |
| `room_welcome` | “Bring a song, a question, or a half-finished idea.” | Shown to new members and in empty states. |

### Component breakdown

| Component | Responsibility | Responsive rule |
| --- | --- | --- |
| `CircleRoomHero` | Establish room identity and primary action | Stack identity and CTA below 480px. |
| `CircleRoomTexture` | Render subtle visual texture | Never carry meaning alone; pair with text labels. |
| `CircleMoodBadge` | Show calm activity language | Use short labels such as “Quiet today” or “People are around.” |
| `CircleRitualCard` | Surface the room’s recurring prompt | One dominant action; secondary dismiss action stays quiet. |
| `CirclePeoplePeek` | Show a small human preview | Use accessible names and avoid ranking members. |
| `CirclePurposeRail` | Filter Ask, Offer, Small win, Pass it on, and Thought | Scrolls horizontally on mobile; labels never shrink below readable size. |

## Shared visual rules

Use one expressive identity element per surface: a profile vibe, a Circle pattern, or a playful prompt. Do not combine every decoration at once. Keep text measure between roughly 32 and 68 characters per line, allow long names to wrap, use `min-width: 0` in flex children, and avoid fixed heights around user-generated text.

Use motion only for feedback: a gentle pulse when a Circle prompt is new, a small high-five when encouragement is sent, or a soft reveal when a room ritual opens. Respect `prefers-reduced-motion` and provide equivalent static states.

## Suggested rollout

First add the content fields and display fallbacks without requiring a migration for existing members. Next introduce the visual identity controls to Circle creation and editing. Then add `PlayfulProfileCard` to Explore, Circle member previews, and Messages. Finally add Circle rituals and lightweight reaction stamps after testing the tone with target users.
