# Development and maintenance

Read the section relevant to the task. Current behavior and project claims live in source/data/tests; this reference covers occasional maintenance.

## Run locally

Use the Node version in [.nvmrc](../.nvmrc) and the npm requirement in [package.json](../package.json).

```sh
npm ci
npm run dev
```

The dev server binds to localhost. Use `npm run dev -- --host` for another device on a trusted network. After `npm run build`, `npm run preview` serves the production build at `/`, matching `https://ch1mple.id.vn/` on GitHub Pages. The custom domain is configured in the repository's Pages settings; this GitHub Actions deployment does not require a `public/CNAME` file.

## Update assets

- **Resume:** replace `public/documents/resume.pdf`, then run `node scripts/prepare-resume-assets.mjs`. Optional tools: `npm install --no-save --package-lock=false pdfjs-dist @napi-rs/canvas`, or point `PDFJS_PACKAGE` / `CANVAS_PACKAGE` at existing installations. If the page count changes, update the page list and labels in [ResumeViewer.astro](../src/components/ResumeViewer.astro).
- **Component previews:** with the dev server running, run `node scripts/prepare-component-previews.mjs`, then rebuild. This refreshes the WebP cards and content-version manifest. Set `COMPONENT_PREVIEW_ORIGIN` for another server, or `COMPONENT_PREVIEW_IDS=reverie` to refresh one study.
- **Cutout stickers:** run `node scripts/prepare-cutout-stickers.mjs` to regenerate and embed the optimized photos in the standalone HTML. Retain [photo provenance](../public/components/stickers/SOURCES.md) and [logo provenance](../public/components/logos/SOURCES.md).
- **GOAT videos:** keep source-backed clips synchronized between [SWork.astro](../src/components/SWork.astro) and [optimize-goat-videos.mjs](../scripts/optimize-goat-videos.mjs). With FFmpeg available, run `node scripts/optimize-goat-videos.mjs` (optional first argument: FFmpeg executable path). Originals stay in `src/assets/goats/`; delivery videos go to `public/goats/full/`. Directly supplied public videos, such as TheCuriosityGene, stay outside the optimizer until an original source clip is available.
- **Obox screenshots:** after replacing supplied PNGs in `public/builds/oboxsteam/`, run `node scripts/prepare-obox-assets.mjs` for smaller WebP variants.
- **Music:** replace `src/assets/music/no-church-in-the-wild.mp3`, or set `PUBLIC_MUSIC_TRACK_URL` in `.env`, then restart/rebuild. Relative public paths receive the production base. HTTPS sources need CORS for the audio graph; this setting is public browser configuration.

## Check a change

Choose checks for the affected code. Application checks:

```sh
npm test
npm run build
node node_modules/typescript/bin/tsc --noEmit
```

For dependency changes, also run `npm audit`.

Browser scripts require Playwright and Microsoft Edge. `PLAYWRIGHT_PACKAGE` can point to an existing Playwright installation. These scripts serve `dist/` themselves after a build:

- `node scripts/qa-components.mjs` — gallery, deferred demos/source, copy/download, and study interactions.
- `node scripts/qa-reverie.mjs` — six reversible formations, photo inspection, input, reduced motion, and standalone/source integration.
- `node scripts/qa-emulsion.mjs` — curated prints, fixed Worlds wall, magnetic Moments card sequence with denser game copy, responsive reachability, wind interactions, and source/viewer integration.
- `node scripts/qa-resume.mjs` — responsive preview, focus, zoom, and PDF links.
- `node scripts/qa-music.mjs` — audio and turntable; `MUSIC_QA_URL` can target a running dev server instead.
- `node scripts/qa-infrastructure.mjs` — architecture inspections, flow, keyboard, themes, and reduced motion.

`node scripts/qa-cutout-board.mjs` targets the running dev server instead. Set `COMPONENT_BOARD_URL` to override its Cutout URL.

Generated QA files stay in ignored `.astro/`. Report current results briefly in chat. For a timing-sensitive Cutout assertion, inspect the failing animation phase before changing the choreography.
