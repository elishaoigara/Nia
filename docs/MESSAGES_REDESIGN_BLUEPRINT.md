# Nia Messages Redesign Blueprint

## Product direction

Nia Messages should feel like a warm continuation of community, not a generic inbox. A conversation should carry context: how two people met, which Circle connects them, and why the message is welcome. The interface should feel relaxed and expressive while preserving privacy, message requests, blocking, reporting, disappearing media, realtime updates, and low-data behavior.

## Main issues visible in the current experience

The current inbox is functional but visually sparse and formal. A dark page with a narrow centered column, a generic “Primary / Requests” split, and rows containing only avatar, name, preview, and date makes conversations feel like an email queue. The conversation view has good mechanics, but its large empty canvas, dense metadata, and compact bottom composer do not yet communicate warmth or Circle context.

The strongest opportunity is to introduce human context without adding clutter: show how a conversation started, use softer language, give requests clearer safety framing, and make the active conversation header and composer feel like a room shared by two people.

## Inbox wireframe: mobile

```text
┌─────────────────────────────────┐
│ Messages                    +    │
│ Keep the good conversations     │
│ close.                          │
├─────────────────────────────────┤
│ [ Search people or conversations ]│
├─────────────────────────────────┤
│ [Conversations 3] [Requests 1]  │
├─────────────────────────────────┤
│ KEEPING THE THREAD WARM         │
│                                 │
│ ◉  Amara                 12m    │
│    Nairobi Music · You: same!  │
│    [🎵 Circle context]          │
│                                 │
│ ◉  Andre                   Tue  │
│    Young Creators · Small win  │
│                                 │
│ NEW PEOPLE TO MEET              │
│ ◉  Zuri                    2h   │
│    Wants to talk about design  │
│    [Accept] [Not now]           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Find someone from your      │ │
│ │ Circles to say hello to     │ │
│ │ [Explore people]            │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Home Explore Flicks Messages Me │
└─────────────────────────────────┘
```

## Inbox wireframe: desktop

```text
┌───────────────┬─────────────────────────────────────────────┐
│ Nia           │ Messages                              +      │
│ Home          │ Keep the good conversations close.          │
│ Explore       │ [Search people or conversations]            │
│ Flicks        │ [Conversations] [Requests]                 │
│ Messages      ├─────────────────────────────────────────────┤
│ Me            │ ◉ Amara     Nairobi Music · You: same! 12m │
│               │ ◉ Andre     Young Creators · Small win Tue │
│ [+ Drop post] │                                             │
│               │ A note about requests:                      │
│ Settings      │ Only accept conversations you welcome.      │
└───────────────┴─────────────────────────────────────────────┘
```

## Conversation wireframe: mobile

```text
┌─────────────────────────────────┐
│ ‹  ◉ Amara                 ⋯    │
│    From Nairobi Music · Active  │
├─────────────────────────────────┤
│       You both met in a Circle  │
│                                 │
│        [ 12 Aug ]               │
│ ◉  Hey, that playlist was good  │
│    10:42                        │
│                                 │
│             I know! The third  │
│             track is everything │
│                         10:44   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Quick ways to reply         │ │
│ │ [Tell me more] [Same here]  │ │
│ │ [Send encouragement]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ [＋] [Message Amara…      ] [➤]│
└─────────────────────────────────┘
```

## Conversation design rules

The header should show the person’s display name, avatar, presence, and a small connection line such as **“From Nairobi Music”** or **“You both follow Young Creators Kenya.”** Keep the connection line optional and privacy-safe. Do not expose Circle membership the recipient has chosen to keep private.

Add one quiet conversation-start context card above the first message. Examples include **“You both answered the same Circle prompt”**, **“Amara replied to your Flick”**, or **“You met in Nairobi Music.”** This makes direct messages feel intentional rather than random.

Use message bubbles with a slightly warmer surface distinction and generous vertical rhythm. Preserve date dividers, new-message dividers, reply previews, media, view-once content, reactions, editing, deletion, and realtime state. Avoid oversized bubbles that consume the conversation canvas on small screens; cap text measure and let long words wrap.

The composer should remain one clear row on mobile, with a separate expandable attachment tray. Add quick-reply chips only when the conversation is empty or after a request is accepted. Quick replies should be suggestions, not automatic messages.

## Inbox component breakdown

| Component | Responsibility | Responsive behavior |
| --- | --- | --- |
| `MessagesHeader` | Title, friendly subtitle, new-message action | Keeps action in a 44px target and wraps subtitle naturally. |
| `ConversationSearch` | Search people and message previews | Full-width field; visible label for assistive technology. |
| `InboxTabs` | Switch between conversations and requests | Two equal-width controls; request count is supplemental text, not color-only. |
| `ConversationSection` | Group active threads and requests | Adds calm section labels; sections collapse into one list on narrow screens. |
| `ConversationRow` | Avatar, name, Circle context, preview, time, unread state | Preview wraps to two lines; never forces name and time into a collision. |
| `MessageRequestCard` | Explain why the request arrived and provide safe actions | Stacks Accept and Not now below 360px. |
| `FindPeopleCard` | Provide a purposeful empty-state route back to Explore | Full-width card with one primary action. |

## Conversation component breakdown

| Component | Responsibility | Safety/accessibility rule |
| --- | --- | --- |
| `ConversationHeader` | Person identity, presence, Circle context, menu | Menu must expose Report and Block with confirmation. |
| `ConversationContextCard` | Explain how the connection began | Hide if the context cannot be verified. |
| `MessageTimeline` | Render dividers, messages, replies, media, and realtime updates | Maintain keyboard focus when new messages arrive; do not steal focus. |
| `QuickReplyRail` | Offer optional warm starters | Native buttons with `aria-label`; never send without a deliberate click. |
| `MessageComposer` | Text, attachments, voice, view-once, send | Keep primary send action visible and provide an error region. |
| `SafetyMenu` | Report, mute, block, and privacy controls | Destructive actions require clear confirmation and status feedback. |
| `TypingPresence` | Show “Amara is typing…” or online state | Treat as ephemeral; never persist as content. |

## Language changes

| Current language | Recommended language |
| --- | --- |
| Messages | Conversations |
| Primary | Conversations |
| Requests | New people |
| Accept | Say hello |
| Decline | Not now |
| Search conversations | Search people or conversations |
| No messages yet | No conversations yet |
| Your conversations | Keep the good conversations close. |
| Message… | Say something… |
| Active 35d ago | Last seen 35 days ago |

Keep “Requests” in supporting text where clarity requires it, but let the visible experience feel human rather than administrative.

## Safety and trust

A request should explain why it exists and remind the recipient they control the conversation. The request card should say: **“Only accept conversations you welcome. You can block or report at any time.”** Report and Block should remain available from both the inbox row and conversation menu. Blocking must update the UI immediately, stop new realtime delivery for that pair, and show a clear reversible-state message where appropriate.

Do not add read receipts, typing visibility, or presence as social pressure by default. These should be controllable from Settings in a later slice. Continue to keep reports private and ensure moderation RLS protects message reports.

## Implementation order

First extract inline inbox styles into reusable classes and introduce the new header, tabs, sections, and conversation rows. Next add Circle context to conversation summaries using only verified shared context. Then redesign the conversation header and composer spacing. After that, add quick-reply suggestions and request education. Finally, run authenticated desktop and mobile QA at 320px, 375px, 390px, and desktop widths, including keyboard navigation, report/block flows, realtime delivery, and low-data behavior.
