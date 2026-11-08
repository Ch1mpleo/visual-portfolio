# Ch1mpleo – Visual Portfolio

A personal corner of the internet where I have fun, experiment with creative dev stuff, and show off my love for video games.

Orginal idea come from [Wodniack] — remixed and made my own.

---

## What this is

This isn't a formal portfolio. It's a playground.

I'm a **Gamer and Developer** who codes by day and games by night. This site is where those two worlds collide — a space to try out wild animations, experiment with design, and keep a piece of the internet that feels like *me*.

---

## Stack

- [Astro](https://astro.build) — static site framework
- [GSAP](https://gsap.com/) — animations
- [Lenis](https://lenis.darkroom.engineering/) — smooth scrolling
- Vanilla SCSS — styling

## Run locally

Use Node.js **22.23.4 or newer** and npm **9.6.5 or newer**. `.nvmrc` records the Node version used by GitHub Pages CI; with nvm installed, run `nvm install 22.23.4` and `nvm use 22.23.4` first.

```bash
git clone https://github.com/Ch1mpleo/visual-portfolio.git
npm ci
npm run dev
```

The development server listens on localhost by default. To preview on another device on a trusted network, run `npm run dev -- --host`.

Before deploying, run `npm test`, `npm run build`, and `npm audit`. Use `npm run preview` to check the production build at `/visual-portfolio/`.

## Resume

The header opens a responsive two-page preview, with zoom and links to open or download the original PDF. Resume assets live in `public/documents/`.

After replacing `public/documents/resume.pdf`, regenerate its preview images with `node scripts/prepare-resume-assets.mjs`. This optional preparation script requires `pdfjs-dist` and `@napi-rs/canvas` (`npm install --no-save --package-lock=false pdfjs-dist @napi-rs/canvas`). If the page count changes, update the `pages` list and page labels in `src/components/ResumeViewer.astro`.

To check the production viewer, build the site and run `node scripts/qa-resume.mjs` with Playwright available. The check covers responsive layouts, themes, zoom, dismissal, focus, scrolling, downloads, and production asset paths.

## Component studies

The Components gallery sits above GOAT. Each card contains a static WebP preview, title, and short description. Interactive demos load only after a card opens. Their downloadable files and copyable source use the same files in `public/components/`.

Open either `.html` file directly in a browser. No package install or build step is needed. Cutout uses Unsplash demo photographs. Emulsion is Ch1mpleo's video game photography wall: original Steam image URLs, descriptions, and orientation live in `photoData`. The first four frames are labeled AC: Origin; the other nine are labeled AC: Black Flag Resync. Four sideways captures rotate upright in CSS. The first chapter introduces Ch1mpleo with the original counter-panning photographer word. In the second chapter, worlds leads nine smaller prints in from the right; they settle into two staggered bands (three rows on phones), stay pinned for a scroll interval, then leave together before the final card. Captions show only the game name and matching white Assassin's Creed crest on hover or keyboard focus. Photo descriptions remain in accessible image text. Paper borders are 2–4px on every side. Logo sources are recorded in `public/components/logos/SOURCES.md`. Wheel, background swipe, arrow keys, Home/End, and the Worlds chapter link navigate the same reversible scroll sequence. Both demos keep one fixed palette and support reduced motion.

Cutout cuts letters from a card, develops a separate photograph inside each letter, then carries those photographs into a contact sheet and its hero print. Closing reverses the handoffs at a faster pace. Transitions use finite Web Animations and clean up their temporary elements, including after interruption or resize. Emulsion uses one animation clock for the pan and damped pendulums; it sleeps when idle, off-screen, or in a hidden tab.

The mood cards can be dragged around the mat. Their rotated rectangles collide with one another and stay inside the board; dragging does not activate a card. Shift+arrow keys nudge a focused card, and Escape cancels an active drag. The arrangement clock sleeps when nothing is moving. Dashed hover outlines run continuously, with a static outline for reduced motion.

Cutout's subdued desk stickers are real photographs with hand-traced cuts, cream paper edges, and baked grain. Their optimized WebP images are embedded in the HTML, preserving single-file copying. [Image sources and processing](public/components/stickers/SOURCES.md) are recorded beside the assets. Regenerate them with `node scripts/prepare-cutout-stickers.mjs`.

The contact sheet uses framed landscape thumbnails, numbered captions, and hand-drawn keeper rings. The intro letters recoil slightly on arrival, with the amount based on the distance travelled; reduced motion skips the movement.

The Code tab uses an IDE layout: HTML, CSS, and JavaScript files in a left sidebar, with the selected file on the right. Each file retains its scroll position and syntax colors. A slim filename header has Lucide copy and download icons; the copy icon confirms success with a checkmark. Download all three files into the same folder to run the split version, or use **Download complete demo** for the original self-contained HTML file. On phones the sidebar collapses to labeled file icons, with the active filename in the editor header. The footer confirms that the demos have no dependencies. Lucide SVGs are vendored from version 0.468.0 with their license in `src/assets/icons/lucide/`; no browser icon library is loaded.

Source splitting and Astro syntax highlighting happen at build time, fetched on demand from `src/pages/component-source/[id].astro`. No browser parser, highlighter, or editor dependency is shipped. To regenerate gallery previews after a visual change, run `node scripts/prepare-component-previews.mjs` against the local development server, then rebuild. The generated preview manifest adds content versions to gallery image URLs so browsers pick up updated board artwork.

After building, run `node scripts/qa-components.mjs` with Playwright available (`PLAYWRIGHT_PACKAGE` may point to an existing installation). It checks deferred loading, responsive cards, syntax highlighting, exact source copying and download, both demos, Cutout's forward/reverse handoffs and cancellation, reduced motion, pointer and keyboard input, fixed demo palettes, focus/scroll restoration, and a 200% equivalent viewport. Screenshots are written to `.astro/components-qa/`.

Run `node scripts/qa-cutout-board.mjs` against the local development server for the photo stickers, marching hover outline, rotated-card separation, swept movement, edge constraints, click/drag distinction, touch, keyboard, resize, sequence position retention, and idle clock. `COMPONENT_BOARD_URL` can point it at another preview.

## GOAT video assets

The original edits live in `src/assets/goats/` and play at their original quality in the popup. The smaller, streaming-friendly copies in `public/goats/full/` play silently on the gallery cards. Opening a card starts the original video from the beginning with sound and controls; closing it resumes the card where it paused. Card videos load as they enter the scene, and posters cover the short wait before playback begins.

To regenerate the delivery files after adding or replacing a source video, install FFmpeg and run:

```bash
node scripts/optimize-goat-videos.mjs
```

The script accepts an FFmpeg executable path as its first argument if it is not on `PATH`. Keep the video list in `scripts/optimize-goat-videos.mjs` and `src/components/SWork.astro` in sync.

---

*Made with ☕, late nights, and too many game references.*
