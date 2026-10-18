# Workstream A visual findings

The local app initially showed a raw Supabase configuration error because the setup route itself still passed through session middleware. After adding an explicit `/setup` middleware bypass, the root now redirects to `/setup` and renders a focused standalone screen.

The rendered setup screen has a clear Nia identity header, an uppercase pre-launch label, a concise headline, explanatory copy, a bordered variable list, server-side credential guidance, and one full-width primary action. The global navigation is not visible on the setup route. The primary action uses the shared button primitive and has a visible focus indicator in the browser view.

The visual style is warm parchment with deep violet accents, a compact centered card, consistent rounded corners, and restrained shadowing. The screen fits the available viewport without horizontal overflow; the browser reported only 56 pixels below the viewport because of page content height.
