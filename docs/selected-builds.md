# Selected Builds handoff

## Packet 2: functional viewer

The gallery opens one native modal dialog mounted outside `.site-wrapper` in
`src/pages/index.astro`. Experience content is rendered at build time in three
project components. `ProjectOverview.astro` provides static Under the Hood
summaries for GraphPaper and Museums. OboxSTEAM uses its own detailed component.

`ProjectViewerController.ts` owns modal state, project/tab selection, tab scroll
positions, museum/anatomy/workflow selection, and the original trigger/page position. The typed
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

## Packet 3: OboxSTEAM system anatomy

`oboxAnatomy.ts` holds six typed parts and their immediate connections.
`OboxUnderHood.astro` renders explanatory HTML, the API layer sequence, and
three native engineering-decision disclosures. `OboxSystemMap.astro` keeps
project-specific geometry separate from content. Both clients connect through
the API; there are no client-to-database routes. The controller owns selection,
updates nodes/edges and pressed states, preserves selection across tabs, and
resets to Shared API with collapsed notes on project changes/reopening.
Native summaries are included in the dialog's focus wrap.

Production build passed. Checked all six selected panels and their connections,
keyboard disclosure opening, tab memory, reopening defaults, and responsive
light/dark layouts at desktop, tablet, and 360–390px phone sizes. Source checks
used the backend architecture/product docs and attendance/notification services.
No live requests or motion were added.

## Packet 4: OboxSTEAM workflows

`oboxWorkflows.ts` defines the three walkthroughs and their 19 steps, descriptions,
takeaways, scope notes, and highlighted node/edge IDs. `OboxWorkflows.astro`
renders workflow selectors, numbered native step buttons, a polite step readout,
Previous/Next controls, and source-backed takeaways. `OboxWorkflowMap.astro`
owns the three fixed diagrams and an abstract QR motif. This is an explanation
of the product, with no checkout, camera, tokens, upload, or publication actions.

- Join a class: pending hold, Stripe checkout/webhook, confirmed enrollment,
  and shared reads/notifications. Failed/expired attempts release pending state.
- Check in: mentor credential rotation, student scan, backend validation,
  attendance persistence, and the first successful check-in notification.
- Capture to portfolio: video capture/storage/processing, conditional face
  matching, completed highlights, web draft import, and separate publication.
  Class moments and session evidence remain distinct; this follows the video path.

The shared controller owns workflow and step state. Changing workflows starts
at step 1; selecting the current workflow leaves its step intact. Tabs preserve
the workflow, step, anatomy, disclosures, and independent scroll positions.
Project changes/reopening restore Join a class, step 1, Shared API, and collapsed
decisions. Step navigation disables at the first/last boundary and never plays
automatically. Phone layouts put the step explanation and controls before the
diagram. Unselected routes are dimmed in both diagrams for clear contrast in
the light theme. Lenis's shared Window type now lives in `src/env.d.ts`, where
TypeScript can see it outside the Astro page script.

### Verification

Production build and `node node_modules/typescript/bin/tsc --noEmit` passed.
Exercised all 19 step buttons and checked the visible readout, active nodes/routes,
and boundary states. Checked Previous/Next, Enter/Space activation, tab memory,
workflow switching/reset, project reset, reopen defaults, and dialog focus wrap.
Inspected desktop, 768px tablet, and 360–390px phones in light/dark themes;
phone diagrams/copy have no horizontal overflow. GraphPaper and the Museums
exhibit selector still work through shared project navigation. Final preview
recorded no runtime errors. Existing build warnings described above remain.

## Next packets

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
