# Builds infrastructure anatomy

Three project-specific scenes, with directly labelled technology and anchored
inspection bubbles. The graph is the primary reading surface. There is no
separate stack list or explanation column.

## Source inspection — 2026-10-21

- **OboxSTEAM:** read the API host, IOC registrations, project references,
  personal-video channel/worker, media services, signed SNS webhook controller,
  blob service, observability setup, Compose definition and deploy workflow in
  `E:/Semester 9/OboxSTEAM.API`. Read both client package manifests and the web
  API/realtime integration files. The inspected source covers clients, the shared backend process, persistence,
  managed media/providers, delivery and telemetry; only core responsibilities
  appear as separate parts in the portfolio overview.
- **GraphPaper:** inspected the current GitHub tree at
  `178907d68316325b24bd3e4c6647fa6328a5ca33`, the host and IOC container,
  `DocumentProcessingService`, `GeminiEmbeddingService`,
  `OllamaKnowledgeExtractionService`, relationship enrichment, `MindmapService`,
  Compose, and the frontend Mermaid viewer/package manifest. The old portfolio
  snapshot was outdated: parsing, chunk preparation, embeddings, extraction,
  enrichment and mindmap generation are implemented. Grounded answers remain
  an intended extension, rather than an inspected working endpoint.
- **Museums:** read both package manifests, App/section composition, MLN131's
  classifier hook and timeline, VNR's game route and local history-pair usage,
  and actual motion/graphics components. The classifier calls Gemini from its
  browser hook when configured; the history game uses local React state.
  Dither/Aurora exist in the source toolkit, but their presence alone does not
  establish that every shader is mounted in the inspected chapters.

Each part links to its inspected source. These are portfolio overviews, not a
service inventory, deployment-health report or measured-traffic display.
GraphPaper's arrows describe the document-to-knowledge workflow; the API still
mediates persistence and browser access. The museum branches describe two
independent exhibits using the same frontend approach.

## Portfolio hierarchy

The overview contains only four Obox parts, four GraphPaper parts and three
museum parts. There are three, three and two connections respectively.

- Obox: web/mobile, shared backend, learning records, personal highlights.
- GraphPaper: source papers, analysis, knowledge store, research canvas.
- Museums: shared frontend foundation, democracy exhibit, history exhibit.

Internal application layers, per-provider services, deployment, telemetry,
individual extraction stages and available shader components no longer compete
as separate devices. Supporting facts belong in concise inspection bubbles.
Visible labels show the core stack directly on the drawing. No external stack
list, relationship list, boxed zones, flow tabs or zoom/pan controls remain.

Recognisable, distinct silhouettes use the Anatomy camera, opaque four-tone
solids, seated parts and fine mechanical detail. The web and mobile devices form
one client assembly; the data cabinet is a lower four-bay appliance rather than
a repeated server rack. Desktop paths are broad curves without crossings.
Narrow layouts put the objects and labels in readable rows with connections in
the left margin, without horizontal scrolling or shrinking the typography.

## Interaction

Hover has a short intent delay, then lifts the object, highlights its related
paths and opens a compact bubble. Click/tap pins it; clicking again dismisses it.
Comic speech bubbles have an ink outline, offset shadow and a tail pointing to
the selected object. Each project has its own muted accent. The headline and
role lead, followed by rounded stack tags, a separated implementation note and
a source link. A Keep open toggle pins/unpins a preview; previous/next controls
browse the parts without closing the bubble, and a counter shows the position.
On narrow layouts, selecting or browsing seats the part below its bubble so
both stay visible. Bubble headers and browse controls remain accessible while
long content scrolls inside. Escape closes the bubble before the project viewer. Arrow
keys navigate spatially; Home/End move to the first/last part.

One Trace flow button plays a finite tour, with a travelling contact and a subtle
destination response. The same control pauses/replays it. Nothing loops at rest.
Reduced motion provides a static Show flow toggle. Hidden/offscreen scenes stop
animation; hover inspection pauses the tour. Inspection dims the other objects
and animates the connected tracks; reduced motion keeps those tracks static.
Scroll and resize keep bubbles inside the visible viewer area, choosing a free
side and omitting the tail if a constrained viewer cannot fit a separated bubble.
A short grace period allows the pointer to travel into the bubble.
Dismissal timers are consolidated so an old
pointer/focus event cannot cancel a new hover preview.

## Verification

Run `npm run build`, `node --test tests/*.test.mjs`, and
`node node_modules/typescript/bin/tsc --noEmit`.

`scripts/qa-infrastructure.mjs` exercises production output in Edge/Playwright:
every inspection, hover intent and bubble entry, pin/unpin, previous/next parts,
keyboard/Escape/focus restoration,
both themes, 390/768/1024 px widths, static and animated flow, finite completion,
pause, offscreen suspension and reduced motion. Proofs/report go to
`.astro/infrastructure-qa-v4/` (ignored). Set `PLAYWRIGHT_PACKAGE` if supplied by
the bundled workspace runtime.

Anatomy's line checker targets `.infra-world` in extracted HTML snapshots.
Review both themes at 4x, especially the client assembly and drive fronts.
Logical connection tracks are not physical cables. No cylinders, free physical
cables, WebGL or exploded poses are used. Vendored kit code retains its MIT
license in the infrastructure directory.

### Bubble refresh validation — 2026-10-24

Production build, TypeScript and all 28 tests pass. The updated browser suite
checks all 11 parts, pin/unpin, in-bubble browsing and hover-to-bubble travel.
At 390/768/1024 px, browsing every stacked part verifies its bubble does not
cover the selected row. Light/dark screenshots, keyboard/Escape behavior,
reduced motion and finite flow playback pass with no page errors.

### Completed validation — 2026-10-21

Build, TypeScript and all 26 tests pass. The production browser run covers all
11 inspections, both themes and 390/768/1024/1440 px layouts, with no page errors,
label overflow or horizontal panning. Hover intent/dismissal, keyboard and
Escape/focus restoration, static reduced-motion flow, moving contacts, pause,
offscreen suspension and finite completion pass. All six Anatomy line audits
report zero floating ends; normal-size and 4x details were reviewed. The running
review server returned HTTP 200 with the new 11-part markup.
