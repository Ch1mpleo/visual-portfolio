# Working on this portfolio

## Start here

This is Viet Anh / Ch1mpleo's personal portfolio and creative playground: software, visual experiments, and games. Keep its personal voice.

Read the relevant source before changing a section. If `docs/handoff.md` exists, read it for unfinished work; confirm its state against the working tree.

The current implementation is a design baseline, open to evolution. The user's latest request can update or overhaul any part. Work independently on scoped improvements; ask when an unresolved choice would materially change a section's identity or behavior.

## Design defaults

- Preserve each section's character during routine changes. Reuse its established patterns rather than applying one layout everywhere.
- The shared shell uses editorial typography, oversized display type, fine rules, grids, and a tactile print feel. Theme/font authorities are in [src/styles/variables-scss](src/styles/variables-scss); use the shared tokens for portfolio UI.
- Components is deliberately open to multiple styles. Its gallery and viewer belong to the site; individual studies can have independent palettes, typography, layouts, and motion. New studies can introduce new art direction.
- Builds share a viewer but retain project-specific artwork and storytelling. Keep the illustrated systems readable as portfolio overviews, with supporting detail available on inspection.
- Treat these as defaults for the current design. When a requested redesign changes them, update the affected guidance to match.

## Find the relevant source

- Page composition, intro, shared scroll lifecycle: [src/pages/index.astro](src/pages/index.astro). Header/footer: `SiteHead.astro`, `SiteFoot.astro` in `src/components/`.
- Hero and About/Skills: `SHero.astro`, `SAbout.astro`, `SkillsGrid.astro` in `src/components/`.
- Builds: [SBuilds.astro](src/components/SBuilds.astro), [src/components/builds](src/components/builds), [src/data](src/data). Current project viewers are continuous scroll stories; source and tests describe the current flow.
- Components: [SComponents.astro](src/components/SComponents.astro), [ComponentPlayground.astro](src/components/experiments/ComponentPlayground.astro), [public/components](public/components), [component-source.mjs](src/utils/component-source.mjs).
- GOAT: [SWork.astro](src/components/SWork.astro), [AWork.astro](src/components/AWork.astro), [VideoPopup.astro](src/components/VideoPopup.astro).
- Interactive quote and contact: [SMyWay.astro](src/components/SMyWay.astro), [SCTA.astro](src/components/SCTA.astro).
- Resume and music: [ResumeViewer.astro](src/components/ResumeViewer.astro), [MusicPlayer.astro](src/components/MusicPlayer.astro), `src/utils/music-*.ts`.
- For local setup, media regeneration, or browser QA commands, read [docs/maintenance.md](docs/maintenance.md).

## Interaction and content contracts

- Preserve keyboard access, focus return, page position, and Lenis state around viewers. Nested inspections handle Escape before their parent viewer. Keep modal scrolling independent of page scrolling.
- Motion must settle cleanly after interruption, resize, or a reduced-motion change. Preserve existing reduced-motion behavior; keep new motion finite or idle/offscreen-aware where appropriate.
- Keep demo documents and highlighted source loading on demand. Standalone demo HTML is the source for preview, copying, and downloads; split/highlight it at build time.
- Keep GOAT's lightweight silent card videos separate from original popup media. Preserve pause/resume behavior and request music audio after user input.
- Ground project claims in the data and linked source. Preserve contribution attribution and implemented-versus-intended distinctions; add metrics or capability claims only with supporting evidence.
- Development uses `/`; production uses `/visual-portfolio/`. Respect `import.meta.env.BASE_URL` for public paths. The `compressHTML` setting preserves whitespace behavior after the Astro migration.

## Verify proportionately

- Documentation-only work: check the diff and local references.
- Application changes: run relevant tests and a production build. Run the TypeScript check when changing typed code; commands are in the maintenance reference.
- UI changes: briefly inspect the affected experience at an appropriate desktop and phone size. Check affected themes, keyboard behavior, and reduced motion when relevant; expand coverage when the change warrants it.
- Use existing targeted QA scripts when they help. Summarize checks and gaps in chat. Keep screenshots, recordings, and QA reports in ignored `.astro/` or external temporary storage.

## Keep context small

Keep durable rules here and occasional maintenance recipes in `docs/maintenance.md`. Exact values, inventories, and behavior belong in source/config/tests; update documentation when a decision actually changes.

Only while work remains, maintain `docs/handoff.md` at roughly ten lines: unfinished task, current state, unresolved decision or verification gap, and next step. Replace stale content; remove the file when that work is complete.

After completing work, remove temporary plans/specs once any lasting guidance has been folded into its existing home. Keep completed history in Git and test results in chat. Preserve asset attribution and license files beside their assets.
