# Selected Builds handoff

## Current implementation: review revision (2026-10-15)

The desktop gallery now fills the available viewport height, rather than using a
fixed 480px grid. At 1366×768, 1440×900, and 1920×1080 the section is 720px,
852px, and 1032px tall respectively, allowing 24px of framing above and below.
Short windows and smaller devices retain natural scrolling. The redundant
section index and footer labels are removed. Platform, unfolding-paper, and
doorway controls replace the repeated arrow, with distinct hover/focus gestures.

OboxSTEAM opens with equal-width copy and film columns on desktop. The role
description lives with the introduction. Each Create / Learn / Show chapter
pairs its illustration with one contextual explanation, its implementation
detail, Previous/Next detail controls, and screenshot access. Selecting an object
changes the explanation, independently for each chapter. GraphPaper similarly
shows one selected pipeline explanation with Previous/Next stage controls;
the implemented-versus-intended scope remains permanently visible. On phones,
explicit illustration activation brings the selected explanation into view and
focuses it. Arrow-key exploration remains within the illustration. Technologies
are grouped into responsibility rows at the end of each story.

This intentionally replaces the previous pass's all-explanations-visible layout
in response to review feedback. The continuous project documents, native modal,
media lifecycle, screenshot zoom, project navigation, and sweep remain.

Build and 16 regression tests pass. Responsive checks cover the target desktop
sizes, a larger desktop, narrower desktop, tablet, phone, and 200% reflow-equivalent
viewport. Actual browser zoom and browser reduced-motion emulation remain
unavailable; preference logic is covered by tests and CSS review.

## First continuous-story pass (2026-10-15)

This section supersedes the historical tab-based notes below. Each project has
one continuous document, with technology groups and destinations at the end.
OboxSTEAM's three chapters and GraphPaper's four explanations remain visible;
selection highlights the corresponding explanation. Both museum exhibits have
their own preview and paired visit/source links, in two desktop columns and one
phone column. Existing project IDs, assets, URLs, and opening events are retained.

The gallery measures approximately 692px at 1366×768 and 695px at 1440×900.
The right illustrations remain approximately 334×214px at 1366px. Its fixed
480px grid starts at 1200px; narrower desktops grow naturally so captions do not
clip. Tablet and phone SVGs are contained within their illustration frames.

Project-switch investigation: OboxSTEAM at scroll position 2027 switched to
GraphPaper at 0 and remained at 0 with no subsequent input. Next/Previous and
rapid switches also reset to 0. Focusing GraphPaper's bottom links moved the
scroller to approximately 1054px, reproducing the reported magnitude through
focus navigation. The original late measurement's precise cause could not be
established from the handoff; no additional scroll-reset workaround was added.

Film playback now checks visibility after the modal scroller resets. A short
sheet no longer autoplays an offscreen film. The intersection observer uses a
zero threshold: rapid switches into a short sheet could leave the film below
the old 15% threshold, so leaving view did not produce a pause callback. Both
fully offscreen and barely visible entry cases were reproduced and rechecked.
Switching projects, closing, screenshot zoom, and reduced-motion changes pause
playback. Reduced motion suppresses autoplay; native controls remain available.

Rendered checks covered 1366×768, 1440×900, 1024×768, 820×1180, 390×844,
320×568, and 1366×500. Light and dark themes, readable captions, SVG containment,
visible explanations, both loaded museum previews, independent Obox selections,
GraphPaper keyboard selection/horizontal panning, native Tab wrapping, Escape,
focus return, screenshot zoom, rapid project switching, interrupted sweeps, and
film pause were checked. No viewer horizontal overflow or runtime errors were
observed. A 683×384 CSS viewport checked the reflow equivalent of 1366×768 at
200% zoom; actual browser zoom is unavailable in the in-app browser. Reduced
motion is covered by lifecycle tests and CSS review because browser preference
emulation is unavailable.

`node --test tests/*.test.mjs` passes 15 tests, replacing the obsolete tab suite
with story/scroll/focus coverage and adding film-visibility coverage. The
production build passes. The five existing Lenis global-type errors and Sass
deprecation warnings remain outside this change's scope. The showreel asset is
preserved without being included in these commits. All work stays local; pushing
remains with the user.

## Historical implementation notes

## Follow-up: OboxSTEAM logo in the gallery

The OboxSTEAM specimen now uses the shared logo beside its title. Its mask inherits
the caption color, including the inverted hover/focus state in both themes.
The viewer uses an explicit component prop for its controller hook, keeping the
gallery logo independent of project switching inside the viewer.

Production build and TypeScript passed. Preview checks covered desktop and 360px
phone layouts, normal and focused caption contrast in both themes, viewer logo
visibility when switching projects, and continued Overview autoplay. No runtime
console errors were observed.

## Follow-up: play the OboxSTEAM film on entry

The showreel starts muted and inline when the OboxSTEAM Overview becomes visible.
Returning to Overview resumes playback; reopening the project starts from the
beginning. Switching tabs or projects and closing the viewer pause it. Playback
is requested through the viewer lifecycle so the hidden film does not autoplay
on initial page load. Native controls remain available for sound and playback.

Production build and TypeScript checks passed. Browser verification confirmed
muted playback on desktop and at 390px, resume on returning to Overview, restart
on reopening or returning to the project, and pause on both other tabs, project
switching, and closing. The hidden film stayed paused after page reload, and no
runtime console errors were observed.

## Follow-up: OboxSTEAM film introduction and branding

Overview introduces the 45-second showreel with a short editorial description.
Copy and film sit side by side on desktop and stack below 988px. The player sizes
as a complete 16:9 frame, with automatic height and a bounded width; the former
independent height cap no longer creates a wide letterboxed player.

`OboxLogo.astro` uses the supplied `public/builds/oboxsteam/logo-obox.png` as a CSS
mask, rendered in the theme's secondary color. It appears in the shared viewer
header across all OboxSTEAM tabs and hides for the other projects. The original
transparent artwork is preserved, and its URL includes the production base path.

Production build and TypeScript checks passed. Preview checks covered 1440px
desktop, 768px tablet, and 360–390px phones in both themes. The 1280×720 film
retains its 16:9 proportions during playback, pauses when leaving Overview, and
fits without horizontal overflow. The logo follows the theme, stays visible in
all OboxSTEAM tabs, hides for other projects, and ships at the expected asset path.
No runtime console errors were observed.

## Follow-up: one stack overview per project

Every project now has a persistent **Stack** tab alongside Overview and Under
the Hood. `projectStacks.ts` is the single typed source for technology names;
`ProjectStack.astro` groups them by responsibility in a two-column editorial
overview, stacking the groups on phones. OboxSTEAM covers web, mobile, API/data,
media/AI, connected services, and delivery/observability. Museums shares one
overview across both exhibits. GraphPaper explicitly separates its inspected
foundations from the intended full research pipeline.

Stack facts, core-stack summaries, contextual technology badges, and the museum
stack paragraph have been removed from the other views. Architecture notes keep
their functional explanations. Tab keyboard navigation includes Stack, with
independent scroll restoration; project changes and reopening reset to Overview.
The showreel pauses when leaving Overview for Stack.

Production build, TypeScript, and all eight viewer motion tests passed. Preview
checks covered 1440px desktop, 768px tablet, and 360–390px phones in both themes:
readable groups without horizontal overflow, all three project stacks, tab
keyboard wrapping/Home/End, scroll restoration, project reset, and showreel pause.
Live/source destinations retain their URLs and new-tab/noopener attributes.
Changing viewport during a native theme transition produced a browser cancellation
message; subsequent theme rendering and viewer interaction remained correct.

## Follow-up: project destination buttons

`ProjectLinks.astro` presents live destinations as prominent filled buttons and
GitHub repositories as separate icon-led source buttons. GraphPaper has source
buttons only; Museums keeps each exhibit's paired live/source destinations.
All existing URLs and new-tab/noopener behavior are preserved. Hover has a small
directional arrow movement, disabled with reduced motion. Production build and
desktop/phone checks passed; source URLs and responsive widths were checked.

## OboxSTEAM: compact three-tab detail

The viewer keeps Overview / Under the Hood / Stack. Overview contains the short
film introduction, native promotional video, its caption, and live/source
destination buttons. The film scales proportionally within a bounded width.
The internal tab key stays
`experience`; its visible label is Overview for all projects.

Under the Hood combines the product story and engineering breakdown in a single
Create / Learn / Show selector. `oboxChapters.ts` holds the chapter summary and
screenshot metadata; `oboxEngineering.ts` holds the nine selectable object notes.
On desktop the illustration and selected note sit beside one another; on tablets
and phones the note follows the illustration. The screenshot is a small optional
attachment below the scene, opening the full image in an inner native dialog.
The previous full-size inline screenshots, focus crops, duplicated chapter
controls, and Shared Foundation strip are removed. Shipping and observing the
system is a visible section rather than a collapsed disclosure. Technologies
remain exclusively in Stack.

`OboxDetailController.ts` handles the single chapter selector, SVG/native object
controls, screenshot inspection, and film lifecycle. Part selections survive tab
and chapter changes. Reopening or changing projects resets the chapter, all three
object selections, and playback. Escape closes the screenshot alone and restores
its attachment button. The image supports keyboard scrolling on phones, and
chapter/object reveals respect reduced motion. Credit retains the confirmed team
lead / primary contributor role across API, web, and mobile.

Original captures and the showreel live in `public/builds/oboxsteam/`; the viewer
serves WebP variants in `generated/`. Regenerate with
`node scripts/prepare-obox-assets.mjs`. Public URLs include Astro’s deployment base.
GitHub Pages checkout already enables Git LFS for the supplied MP4.

Production build, TypeScript, all eight viewer motion tests, and scoped diff
checks passed. Preview checks at 1440px desktop, 768px tablet, and 360–390px
phones covered both themes, all nine notes, SVG keyboard selection, each matching
screenshot, full-image scrolling, nested Escape/focus restoration, tab keyboard
navigation, project/reopen reset, and film playback/pause. No runtime errors were
captured. GraphPaper and Museums retain their content and view switching.

Earlier packet notes below describe the historical implementation, superseded for
OboxSTEAM by the compact three-tab layout above.

## Packet 2: functional viewer

The gallery opens one native modal dialog mounted outside `.site-wrapper` in
`src/pages/index.astro`. Experience content is rendered at build time in three
project components. Every project has a dedicated Under the Hood component.

`ProjectViewerController.ts` owns modal state, project/tab selection, tab scroll
positions, museum/graph selection, and the original trigger/page position.
`OboxDetailController.ts` owns OboxSTEAM's chapters, objects, and media. The typed
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

No new dependencies, live project requests, or URL/history state are introduced.
Artwork IDs are prefixed so gallery/viewer/transition instances coexist.

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

## Packet 5: GraphPaper and Museums interiors

`projectInteriors.ts` contains four GraphPaper stages and three museum layers.
Dedicated Under the Hood components replace the static overview.
`GraphConceptArtwork.astro` separates four illustrated document/graph planes;
its scope block distinguishes verified interfaces/models/embedding service from
the intended extraction, orchestration, and grounded-answer pipeline.
`MuseumLayerArtwork.astro` presents a three-layer editorial stack, with the
selected layer brought forward. Vietnamese titles retain an accented font.
Both museum tabs share the exhibit choice, artwork, and paired Experience links.
The controller preserves stage/layer selection across tabs and resets it on
project changes/reopening. No project services or new dependencies are used.

Production build and TypeScript passed. Checked all four stages, three layers,
exhibit synchronization, VNR202 link pairing, and responsive light/dark desktop,
tablet, and 360px layouts. No horizontal overflow was observed. GraphPaper
foundations were checked against local Semester8 sources. Museum content follows
the earlier README inspection; a fresh GitHub fetch was unavailable this session.

## Packet 6: motion and visual polish

`GalleryMotion.ts` reveals specimens once with a 20px lift, 500ms duration, and
80ms stagger. Keyboard focus immediately reveals its specimen. Gallery artwork
separates by less than 8px on hover/focus, retaining its authored SVG transforms.
`ProjectViewerMotion.ts` owns the GSAP geometry and fades while the shared
controller retains modal state and focus. Desktop opening expands an illustrated
shell from the trigger rectangle in 450ms; closing returns in 300ms. Phone sheets
use a short fade and 16px movement. Project/tab fades last 180ms. Graph and museum
layer selection now has restrained transitions.

Timelines and fade styles are canceled/cleared on interruption. Resize finishes
an active transition; Escape during opening closes reliably. A preference change
to reduced motion finishes the current transition, and subsequent actions are
instant. CSS hover/layer motion also respects the media query. Native scrolling,
focus restoration, and the GOAT pause/resume lifecycle stay in the controller.

Build and TypeScript passed. Browser checks covered interrupted opening for all
three projects, repeated Escape, rapid tab/project changes, resize during opening,
and phone closing. No stale shell, transform, opacity, or scroll lock remained.
`node --test tests/project-viewer-motion.test.mjs` passes five lifecycle tests,
including reduced-motion defaults/changes and cancellation. These tests control
timeline completion; production-browser checks verify actual geometry. The in-app
browser does not expose a reduced-motion emulation control, so preference branches
were verified in tests and CSS media rules were reviewed.

## Packet 7: final acceptance and handoff

All seven packets are complete. Final acceptance standardized OboxSTEAM's public
link label to “Visit website.” The production build, TypeScript check, and five
motion lifecycle tests pass:

```sh
npm run build
node node_modules/typescript/bin/tsc --noEmit
node --test tests/project-viewer-motion.test.mjs
```

Checked 72 project/tab layouts: three projects, two tabs, two themes, and six
viewports (1440×900, 1024×768, 768×1024, 390×844, 360×800, and 844×390).
No horizontal overflow was observed. Header, tabs, footer, and internal scrolling
remain usable in the short landscape viewport. An additional 720×450 layout
check covers the effective CSS viewport of a 1440×900 window at 200% zoom;
the in-app browser's zoom shortcuts did not change its scale, so actual browser
zoom was not verified. Reduced-motion branches are covered by the five tests
and CSS review; browser preference emulation is unavailable here.

Keyboard opening, tab navigation, selector states, project/reset behavior,
Escape, backdrop dismissal, and dragging from the sheet onto the backdrop were
checked. Closing restores the original gallery trigger. Opening and internal
scrolling retain page height; closing retains the page position within 0.5px
of subpixel rounding. Rapid transitions and resizing leave no stale shell,
inline motion styles, or scroll lock. GOAT's Arc Raider popup subsequently
opened with a ready, playing video and closed with playback paused.

All 61 local production asset references resolve under the configured
`/visual-portfolio/` base. DOM IDs are unique, the final browser console has no
errors, and source inspection confirms these components introduce no live
project-service calls. Existing Sass/Browserslist build warnings remain.

Proof images and the 72-case JSON record are saved in
`C:/Users/vieta/.codex/visualizations/2026/10/10/01a126a6-37c3-7321-b6e4-9f5720877a98/`:
`final-gallery.jpg`, `final-obox-experience.jpg`, `final-obox-anatomy.jpg`,
`final-obox-workflow.jpg`, `final-graphpaper-experience.jpg`,
`final-graphpaper-interior.jpg`, `final-museums-experience.jpg`,
`final-museums-interior.jpg`, and `selected-builds-acceptance.json`.

Each packet is committed separately. Pushing remains with the user.

## Follow-up: engaging gallery specimens

Each specimen now has a quiet drafting grid and outlined folio, a directional
inverse-caption wipe, and a project-specific inspection cue. Obox client planes
separate, GraphPaper routes trace with staggered node emphasis, and museum pages
fan outward. Fine-pointer movement adds a restrained, eased scene parallax;
touch devices skip pointer tracking. Keyboard focus gets the same visual state.
Reduced motion disables tracing, fanning, scaling, parallax, and transitions.
Decorative cues stay outside artwork copy, and the inspection button retains its
original accessible name. Production build and TypeScript pass; inspected the
active artwork and caption at desktop and 390px without horizontal overflow.

## Follow-up: directional viewer covers

The scale morph is replaced by a printed, inverse-color project cover. A mask
opens from the right; the oversized title enters as the cover sweeps left to
uncover the sheet. Header, tabs, content, and footer enter in a short sequence.
Closing brings the cover back from the left and withdraws the mask to the right.
The backdrop fades with the sequence. Text/artwork never stretches; phones use
the same direction with a shorter sweep. Cover type also scales with viewport
height to fit short landscape windows. Project/tab changes use a restrained
directional reveal. No dependencies or continuous animation were added.

Interruption preserves the cover's current position before reversing. Resize
finishes the active sequence; reduced motion remains instant. Cleanup removes
mask, backdrop variable, part/title transforms, and panel styles. Modal state,
scroll isolation, Escape, and focus restoration remain in the controller.

Build and TypeScript pass. The motion suite now has eight passing tests covering
direction, absence of nonuniform scale, interruption, phone timing, reduced
motion, resize, and rapid panel changes. Production browser checks covered all
three desktop projects, repeated Escape during opening, resize during opening,
rapid tabs/project changes, dark phone composition, and light 360×800,
844×390, and 1024×768 layouts. No horizontal overflow, stale motion styles,
scroll lock, or console errors remained. Browser reduced-motion emulation is
still unavailable; those branches are verified by tests and CSS review.
`engaging-gallery-final.jpg` and the `viewer-sweep-*.jpg` frames in the proof
directory above capture the completed gallery and the transition sequence.

## Content references

The original planning inspection used the local OboxSTEAM API product overview
(`D:/Project/Semester9/OboxSTEAM.API/docs/product/overview.md`) and cross-app flow
index (`D:/Project/Semester9/OboxSTEAM-Architecture-Index/data-flow-structural-index.md`),
plus mobile routes/API wrappers and attendance, media, and notification code.
GraphPaper content distinguishes its inspected frontend screens, data models,
and embedding service from its intended complete GraphRAG pipeline. Museum
content follows the MLN131-Visual and VNR-Visual public READMEs.

Preserve the confirmed team-lead / primary-contributor attribution; do not invent sole
authorship, performance figures, adoption metrics, or a working GraphPaper demo.
