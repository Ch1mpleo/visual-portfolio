# Selected Builds handoff

## Packet 2: functional viewer

The gallery opens one native modal dialog mounted outside `.site-wrapper` in
`src/pages/index.astro`. Experience content is rendered at build time in three
project components. `ProjectOverview.astro` provides static Under the Hood
summaries until the later packets replace them with detailed interactions.

`ProjectViewerController.ts` owns modal state, project/tab selection, tab scroll
positions, museum selection, and the original trigger/page position. The typed
`open-project-viewer` event carries a project ID and the gallery button.

- Open and project changes reset to Experience and the top of the scroller.
- Tab changes remember independent scroll positions during the current opening.
- Closing/reopening and project changes reset the museum to MLN131.
- Previous/next wraps through OboxSTEAM, GraphPaper, and Museums.
- Close, Escape, and desktop backdrop dismissal restore the original button.
- Tab/Shift+Tab wrap within the dialog; tab arrows, Home, and End select views.
- Backdrop dismissal requires pointer-down and pointer-up outside the sheet.
- Lenis stops; native scrolling is isolated inside `data-lenis-prevent`.
- A dedicated root overflow lock preserves document height. The custom page
  scrollbar is hidden and GOAT videos use the existing pause/resume events.
- The video popup blocks project-viewer opening while it is active.
- The outer dialog uses `overflow: clip` so native focus scrolling cannot move
  its persistent header/footer. Only its content region scrolls.
- Scroller reset occurs after `showModal()`, when the dialog has layout.

No new dependencies, live project requests, URL/history state, or viewer motion
are introduced. Artwork IDs are prefixed so gallery/viewer instances coexist.

### Verification

Production build and `/visual-portfolio/` preview passed. Inspected light/dark
desktop and phone views, 768px tablet, 360–390px phones, and an 844×390 landscape
view. Checked keyboard opening with Enter/Space, Tab wrap, tab arrows/Home,
independent tab scroll memory, project wrapping/reset, museum link pairing,
Close/Escape/backdrop dismissal, inside-to-outside drag, resize while open,
and reopening at the top. Document height and background position stay stable
at a fixed viewport; inactive content is hidden and SVG IDs are unique.
GOAT scrolling and its video popup/playback still work afterward. No runtime
console errors were recorded in the final preview. Existing Sass mixed-declaration
and outdated Browserslist build warnings remain.

## Next packets

3. Replace the OboxSTEAM overview with six selectable anatomy nodes, API-layer
   detail, and engineering-decision notes.
4. Add OboxSTEAM's Join a class, Check in, and Capture to portfolio walkthroughs.
5. Add GraphPaper's four-stage concept and the museum layer breakdown. The
   Experience exhibit selector and paired links are already complete; retain
   its state in the controller and synchronize the new museum breakdown.
6. Add gallery and viewer motion, including reduced-motion alternatives.
7. Perform final full-feature acceptance checks and fix discovered issues.

## Content references

The original planning inspection used the local OboxSTEAM API product overview
(`D:/Project/Semester9/OboxSTEAM.API/docs/product/overview.md`) and cross-app flow
index (`D:/Project/Semester9/OboxSTEAM-Architecture-Index/data-flow-structural-index.md`),
plus mobile routes/API wrappers and attendance, media, and notification code.
GraphPaper content distinguishes its inspected frontend screens, data models,
and embedding service from its intended complete GraphRAG pipeline. Museum
content follows the MLN131-Visual and VNR-Visual public READMEs.

Preserve attribution as “Built across API, web, and mobile”; do not invent sole
authorship, performance figures, adoption metrics, or a working GraphPaper demo.
