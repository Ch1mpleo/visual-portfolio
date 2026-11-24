# Design ambience and playground direction

Read this before designing, updating, or adding UI to the portfolio. This repository is a **visual playground**, not a rigid component kit: its sections intentionally look and move differently from one another while sharing one unmistakable theme, voice, and level of craft.

Token authorities live in [src/styles/variables-scss/](../src/styles/variables-scss/) and [src/styles/variables-css/](../src/styles/variables-css/). Default UI SDK styling lives in [src/styles/components/_ui-sdk.scss](../src/styles/components/_ui-sdk.scss).

## 1. The overall ambience and feeling

This is **Viet Anh / Ch1mpleo**'s personal portfolio and creative playground: software engineering, visual experiments, and video game worlds.

- **Mood:** An authored print broadsheet crossed with a tactile workshop—warm paper and deep ink in light mode, charcoal inkwell and antique parchment-gold in dark mode—alive with kinetic experiments (waves, compasses, drafting grids, 3D reels, vinyl decks, and interactive studies).
- **Feel:** Personal, unhurried, playful yet intentional. Every section feels like its own exhibit inside one cohesive gallery, never like a repetitive SaaS landing page.
- **Voice:** Direct, first-person, warm, slightly understated. Short titles, grounded copy, zero corporate hype.

## 2. Freedom tiers: what stays constant vs. what is free to invent

Do not clone an existing section's layout, corner radius, or widget style just because it already exists. Match the **theme and craft**, and let each section or feature earn its own form.

### Tier 1 — Always keep (Theme, craft, and contracts)
- **Light and dark theme continuity:** Anchor every section's base canvas and ink in `color(<token>)` / `var(--color-*)` so both `:root` (light) and `.theme-dark` (dark) feel deliberate.
- **The three typographic voices:** Use `Bigger Display`, `Editorial New`, and `Fraktion Mono` across the main portfolio (only standalone studies inside `public/components/` are free to introduce completely separate font families).
- **Accessible contrast in both themes:** Keep text at `>= 4.5:1` (`>= 3:1` for large display type) and interactive control edges, focus indicators, and active states at `>= 3:1` in both light and dark mode.
- **Tactile craft and motion hygiene:** Animations should feel deliberate, settle cleanly after interruption or resize, pause offscreen work when appropriate, and respect `prefers-reduced-motion: reduce`.
- **Scroll and focus contracts:** Preserve Lenis state, scroll position, focus return, and nested `Escape` precedence around modals/viewers.
- **Personal voice:** Keep copy grounded in Viet Anh / Ch1mpleo's real work and personality.

### Tier 2 — Default starting point (Freely overridable)
- [src/styles/components/_ui-sdk.scss](../src/styles/components/_ui-sdk.scss) sets global `--ui-*` tokens and wraps editorial `[data-slot]` defaults inside `@layer ui-sdk-defaults`.
- Utility overlays, toolbars, tabs, menus, and dialogs inherit a clean, theme-aware editorial look out of the box—and because those defaults are layered, any section's scoped Astro `<style>` overrides corners, typography, spacing, borders, or hover feel cleanly with no `!important`.

### Tier 3 — Explicitly free to invent
- **Geometry and silhouette:** Sharp `0px` architectural framing is common across viewers and headers, but rounded forms, circles, tactile physical hardware, organic masks, and irregular crops are completely welcome when they serve the concept.
- **Layout and composition:** Grids, asymmetric spreads, sticky scroll stories, floating instruments, canvases, and full-bleed stages.
- **Hover and interaction choreography:** Inverted-ink fills, hairline underlines, blinking cursor ticks, magnetic/elastic physics, drag-to-cue controls, or entirely new micro-interactions.
- **Local atmospheric colors:** A section or instrument may introduce local surface tones, grain, glow, or accents (like `MusicPlayer`'s vinyl deck or `ComponentPlayground`'s `#0a0a0a` code editor) as long as it harmonizes with `--color-*` and switches cleanly between light and dark mode.

## 3. Existing sections: proof of variety, not templates to copy

The current page proves how wide the playground range is under one theme:

| Section / Feature | Its own visual personality |
| --- | --- |
| **Header & Footer (`SiteHead`, `SiteFoot`)** | Hairline-divided print strip, blinking nav ticks, directional View Transition theme sweep. |
| **Hero (`SHero`)** | Kinetic SVG wave field + monumental split-character `Bigger Display` headline + ticker separators. |
| **About (`SAbout`, `SkillsGrid`)** | Interactive drafting grid + floating brand-mark canvas particles behind editorial prose and skills. |
| **Builds (`SBuilds`, `ProjectViewer`)** | Specimen gallery opening into continuous scroll stories with bespoke project artwork and isometric architecture diagrams. |
| **Components (`SComponents`, `ComponentPlayground`)** | Quiet editorial gallery launching completely independent standalone interactive studies (`public/components/`) + a dark IDE code viewer. |
| **GOAT (`SWork`, `VideoPopup`)** | Scroll-scrubbed 3D video reel with masked framing and fullscreen media popup. |
| **My Way & Contact (`SMyWay`, `SCTA`)** | Orbiting compass rose, floating frames, distorted type, and a pulsing circular `GO` orb over an elastic wave grid. |
| **Music (`MusicPlayer`)** | Floating 3D vinyl turntable with hinged acrylic cover, spring levitation, 360° orbit inspection, 1:1 vinyl scratch, sculpted 3D tonearm, and 3D volume fader. |

When adding a new section or visual feature, draw from this **range of invention** rather than flattening the new work into a clone of one existing section.

## 4. Theme tokens and typography reference

### Color tokens (`_colors.scss`)

| Token | Light (`:root`) | Dark (`.theme-dark`) | Role |
| --- | --- | --- | --- |
| `primary` | `#fff2ed` | `#141618` | Base paper / dark canvas, inverted foreground |
| `secondary` | `#160000` | `#eee9df` | Primary ink, headings, high-contrast fill |
| `muted` | `#4d4040` | `#b7b2a9` | Secondary copy, eyebrows, captions, hints |
| `surface` | `#fff2ed` | `#1c1f22` | Elevated panels, popovers, cards |
| `surface-raised` | `#fff2ed` | `#25292d` | Nested wells and subtle raised fills in dark mode |
| `line` | `#160000` | `#484b4e` | Structural dividers and hairlines |
| `grid` | `#160000` | `#34383b` | Background drafting grids |
| `accent` | `#160000` | `#d6c5a3` | Focus rings, ornaments, warm highlight in dark mode |
| `frame` / `frame-ink` | `#160000` / `#fff0eb` | `#25292d` / `#eee9df` | Framed chrome headers and badges |
| `stage` / `stage-ink` | `#160000` / `#fff2ed` | `#0b0d0f` / `#eee9df` | Dark exhibition stages and media backdrops |
| `action` / `action-ink` | `#160000` / `#fff2ed` | `#25292d` / `#eee9df` | High-emphasis controls and focal CTAs |
| `overlay` | `rgba(22, 0, 0, 0.92)` | `rgba(5, 7, 9, 0.94)` | Modal and viewer backdrops |
| `shadow` | `#4d4040` | `#050607` | Shadow base tone |

- **Light mode** reads like warm letterpress print: unbleached cream paper (`#fff2ed`) and oxblood-black ink (`#160000`).
- **Dark mode** reads like a cool charcoal inkwell (`#141618` / `#1c1f22` / `#25292d`) with warm bone ink (`#eee9df`) and antique parchment-gold (`#d6c5a3`). Because `--color-line` (`#484b4e`) is intentionally subtle in dark mode, give interactive control edges higher contrast (`--ui-input`, `color(accent)`, or `color(secondary)`).
- **Theme switch:** Directional View Transition wipe ([_theme-transition.scss](../src/styles/site/_theme-transition.scss)), disabled under `prefers-reduced-motion: reduce`.

### The three typographic voices (`_fonts.scss`)
- **`font-family(bigger)` (`Bigger Display`):** Compressed, poster-scale uppercase display (`700`, tight line-height `0.8`–`0.95`) for hero/section impact and bold covers.
- **`font-family(editorial)` (`Editorial New`):** Humanist serif (`@include t(base)`: `16px / 1.48 / -0.025em`) for narrative prose, expressive italic accents, and calm titles.
- **`font-family(fraktion)` (`Fraktion Mono`):** Crisp technical monospace (`9px`–`14px`, often uppercase with `0.04em`–`0.1em` tracking) for navigation, eyebrows, metadata, controls, and indices.

### Shared helpers
- Easing curves live in [_easing.scss](../src/styles/helpers/_easing.scss) (`ease(out-expo)`, `ease(in-out-expo)`, `ease(in-out-quint)`, etc.).
- Responsive breakpoints live in [_breakpoints.scss](../src/styles/variables-scss/_breakpoints.scss) via `@include mq(...)`.
- Standard main-column cap when using a contained spread is `max-width: 1560px` with fluid gutters `clamp(1rem, 3.5vw, 4rem)`, though full-bleed stages are equally welcome.

## 5. Using Vercel UI SDK (`@ui-sdk/web` & `@ui-sdk/core`)

This repo includes `@ui-sdk/core` and `@ui-sdk/web` (Web Components—no React/Vue runtime overhead in Astro).

### When to use it vs. stay custom
- **Use `@ui-sdk/web`** for standard interactive UI primitives that need solid ARIA, focus management, dismissal, or keyboard navigation: dialogs, alert dialogs, drawers, popovers, menus, tabs, selects, comboboxes, command palettes, accordions, tooltips, switches, toggles, and toasts.
- **Stay custom (or compose `@ui-sdk/core` behaviors directly)** for bespoke tactile playground instruments (like turntables, physics/wave canvases, custom scrubbers, 3D reels) and standalone zero-dependency HTML studies in `public/components/`.
- **Do not rewrite existing working components** (`ResumeViewer`, `ComponentPlayground`, `ProjectViewer`, `VideoPopup`, `MusicPlayer`) just to migrate them onto UI SDK unless a task specifically calls for it.

### Implementation checklist
1. Follow the installed `ui-sdk` skill ([.agents/skills/ui-sdk/SKILL.md](../.agents/skills/ui-sdk/SKILL.md)) and read `node_modules/@ui-sdk/web/docs/llms.txt`, then only the component doc you need (e.g., `node_modules/@ui-sdk/web/docs/components/popover.md`). For custom primitives, search `node_modules/@ui-sdk/web/docs/core.md` by heading and read `rendering.md`.
2. Import only the specific entry in your `<script>` (e.g., `import '@ui-sdk/web/popover'`). Never import `@ui-sdk/core/internal/*`.
3. Do not import `@ui-sdk/core/web.css` globally (its bare element rules would leak onto the rest of the page). Cascade layers are already declared in [src/styles/site/_layers.scss](../src/styles/site/_layers.scss) as `@layer ui-sdk, ui-sdk-defaults;`.
4. Style freely: let `@layer ui-sdk-defaults` handle the baseline, or override any `[data-slot]` in your component's scoped `<style>` to match that section's own personality.
5. For modal primitives (`<ui-dialog>`, `<ui-alert-dialog>`, `<ui-drawer>`), add `data-lenis-prevent` on scrollable regions and sync `openchange` with `window.lenis` so background scroll and scroll position stay intact.

## 6. Anti-patterns to avoid (generic AI / SaaS autopilot)

These guard against **unintentional generic defaults**—never against authored playground craft.

| Avoid (autopilot) | Aim for instead |
| --- | --- |
| Generic SaaS card grids (cookie-cutter rounded-xl cards with faint gray shadows and pill badges) | Intentional composition that fits the section's concept—whether sharp editorial print, circular hardware, or an open interactive stage |
| Default AI palettes (neon purple/blue gradients, generic gray-50/gray-900 Tailwind blocks) | Anchoring in `--color-*` light/dark tokens, adding local atmospheric color/grain/glow only when it serves the piece |
| System sans-serif (`Inter`, `Arial`, `system-ui`) for portfolio UI | The three site voices (`Bigger Display`, `Editorial New`, `Fraktion Mono`) |
| Light-only or hardcoded hex colors that break `.theme-dark` (or low-contrast dark mode) | Intentional, verified light and dark states (`>= 4.5:1` text, `>= 3:1` interactive edges/focus) |
| Flattening a new section into a clone of an existing one | Giving each section its own memorable rhythm while feeling unmistakably part of the same world |
| Corporate marketing copy ("Elevate your digital experience") | Direct, personal, grounded voice |
