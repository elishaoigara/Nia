# Nia Design System

## Product expression

Nia should feel **warm, purposeful, and communal**. The interface should make it easy to understand why a person, Circle, or contribution matters. It should not imitate the visual grammar of an attention marketplace.

> **Design rule:** Every primary surface should answer what this is, who it is for, and what a member can do next.

## Visual foundations

Nia uses warm parchment surfaces, warm charcoal text, and deep violet as the single brand accent. Coral is reserved for destructive actions and urgent attention. Other semantic color variables remain available for compatibility with existing feature components, but new UI should prefer the canonical accent and semantic tokens.

| Token family | Use |
|---|---|
| `--surface-0` | Page background and primary app canvas |
| `--surface-1` | Panels, secondary cards, setup surfaces |
| `--surface-2` | Inputs, chips, subdued control backgrounds |
| `--surface-3` | Hover states and stronger neutral contrast |
| `--text-primary` | Headings, main content, essential labels |
| `--text-secondary` | Supporting copy and metadata with readable contrast |
| `--text-tertiary` | Non-essential metadata and hints |
| `--nia-accent` / `--nia-violet` | Brand action, selected state, links, progress |
| `--nia-coral` | Destructive action, report state, urgent error |
| `--grad-brand` | High-value primary actions and identity moments only |

## Typography and hierarchy

Use Inter and the existing system fallback stack. Headings use tight tracking and strong weight to create clear landmarks. Body copy should remain comfortable to read on mobile with a line height around 1.5–1.65. Avoid all-caps except for short eyebrow labels, status labels, and categories.

A page should generally have one dominant heading, one supporting explanation, and one primary action. Secondary actions should be visually quieter and should not compete with the primary path.

## Shape, spacing, and motion

Controls use a 12px radius and a minimum height of 44px to support mobile touch. Cards use a 16px radius. Use the shared easing tokens for motion, keep transitions under 300ms, and animate only opacity and transform for routine interactions. All non-essential motion must respect `prefers-reduced-motion`.

The shared primitives are:

| Primitive | Class | Purpose |
|---|---|---|
| Primary action | `.btn-primary` | One main action per surface |
| Secondary action | `.btn-ghost` | Reversible or lower-priority actions |
| Destructive action | `.btn-danger` | Delete, block, suspend, or irreversible action |
| Form control | `.input` | Text inputs, textareas, and select-like controls |
| Surface | `.card` / `.surface-panel` | Content grouping and hierarchy |
| Heading | `.section-heading` | Reusable section landmark |
| Touch feedback | `.tap-sm` / `.tap-xs` | Short press confirmation |
| Focus treatment | `:focus-visible` | Keyboard and assistive navigation |
| Visually hidden text | `.visually-hidden` | Accessible labels without visual duplication |

## Interaction principles

Primary actions should use a clear verb such as **Join Circle**, **Share an opportunity**, **Ask the community**, or **Create post**. Icon-only controls require an accessible name. Loading states must preserve layout and explain what is happening. Empty states should provide a meaningful next action instead of only stating that nothing exists.

The app shell uses Home, Explore, Flicks, Messages, and Me. Circles are a core object and should be linked contextually from Home, Explore, profiles, and posts. The setup route intentionally hides the app navigation because it is a deployment state, not a member experience.

## Accessibility baseline

All controls must be keyboard reachable and have visible focus. Touch targets should be at least 44px where practical. Dialogs and sheets must support Escape and focus return. Status changes such as saving, upload progress, message send, and report completion should be announced. Media must have meaningful alternative text, captions, or transcripts where relevant. Motion must reduce automatically when the user requests reduced motion.

## Review checklist for new screens

Before merging a screen, confirm that it uses the shared tokens, has one clear primary action, works at 320px and 390px widths, provides loading/empty/error states, exposes accessible names and focus, respects dark mode, and does not introduce a new brand color or radius without a documented reason.
