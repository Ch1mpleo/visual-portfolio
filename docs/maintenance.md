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
- `node scripts/qa-analytics.mjs` — GA4 actions, absence of recording controls/SDK for new and previously opted-in visitors, themes, responsive layout, and local-preview isolation. It intercepts every external request.
- `node scripts/qa-music.mjs` — audio and turntable; `MUSIC_QA_URL` can target a running dev server instead.
- `node scripts/qa-infrastructure.mjs` — architecture inspections, flow, keyboard, themes, and reduced motion.

`node scripts/qa-cutout-board.mjs` targets the running dev server instead. Set `COMPONENT_BOARD_URL` to override its Cutout URL.

Generated QA files stay in ignored `.astro/`. Report current results briefly in chat. For a timing-sensitive Cutout assertion, inspect the failing animation phase before changing the choreography.

## Google Analytics

Manual dashboard: [Google Analytics — Portfolio](https://analytics.google.com/analytics/web/#/a386174792p526674478/) for traffic, acquisition, and events. Sign in with the Google account that owns the property.

The page keeps GA4 measurement ID `G-RH2J4YXLP3`. [analytics.ts](../src/utils/analytics.ts) owns initialization, safe custom payloads, delegated links, and section visibility. [Analytics.astro](../src/components/Analytics.astro) is the entry point; interaction owners report actual viewer opens/switches and successful code actions. Development builds and local/private hosts never load Google Analytics, including production previews on localhost. There is no hostname allowlist tied to the custom domain.

Custom events:

- `section_view`: each main section once per page after one continuous second in the viewport's central band; background tabs, the intro, and open viewers pause the dwell.
- `navigation_click`: section/home navigation; `destination` identifies the target.
- `project_open`: project viewer open or next/previous project; `content_id` identifies the project and `action` distinguishes open/next/previous.
- `project_inspect`: an architecture part is selected; `content_id` identifies the project and `action` the part.
- `component_open`, `component_view`: study opened or preview/code tab changed; `content_id` is the study ID.
- `component_copy`, `component_download`: successful clipboard copy or download initiated; `language` is html/css/js or complete for a full demo download.
- `resume_open`, `resume_pdf_open`, `resume_download`: embedded preview, original PDF link, or download initiated. A modified/middle click on the header résumé link counts as a PDF open.
- `contact_click`, `outbound_click`: email action or external link; email addresses are excluded, and external destinations omit queries/fragments and are capped at 100 characters.
- `goat_video_open`: original clip popup opened; `content_id` is the stable clip name.
- `theme_change`: visitor selects light/dark.

These custom actions have different names from GA4 enhanced-measurement `click` and `file_download`; use the custom event names when comparing portfolio interactions rather than adding automatic and custom counts together. Clicks indicate intent, not completed résumé transfers or email messages. Preview iframe interactions are not individually instrumented as GA4 events. New events start collecting after deployment and cannot reconstruct earlier clicks.

In GA4 Admin → Custom definitions, register **event-scoped** dimensions for `section_id`, `content_id`, `destination`, `action`, and `language` to enable their breakdowns in reports and the Data API/MCP. Realtime and DebugView can inspect incoming events/parameters first; custom definitions and ordinary reports take processing time. Use Explore → Free form with Event name/Content ID/Section ID and Event count/Total users for popular content. Use Explore → Path exploration with Event name to investigate action sequences, and Funnel exploration for paths such as section visit → project open → contact click. Existing acquisition reports provide traffic sources/device/country; filter hostname when comparing domains. Keep the web stream URL current after a domain move and preserve the measurement ID.

### Local Analytics MCP

Google's official `analytics-mcp` runs separately from the site. It needs Python 3.10+, the Google Analytics Admin/Data APIs enabled in a Cloud project, and credentials authorized for `https://www.googleapis.com/auth/analytics.readonly` with access to the GA4 property. Browser sign-in alone does not create these Application Default Credentials. Follow [Google's setup](https://github.com/googleanalytics/google-analytics-mcp#setup-instructions-).

Install with `uv tool install analytics-mcp --python 3.13`, register the resolved executable with `codex mcp add google-analytics -- <absolute executable path>`, and verify via `codex mcp get google-analytics`. Keep write tools disabled for normal reporting. Store OAuth/client/ADC files outside the repository; never put credentials into public Astro variables or the site bundle. Confirm authentication with `get_account_summaries` and then `run_realtime_report` for the correct property. Server registration and tool discovery alone do not prove account access, and adding configuration does not inject tools into an already-running agent session.

If Google blocks the default Cloud CLI OAuth client when requesting `analytics.readonly`, create a Desktop OAuth client in your Cloud project's Google Auth Platform and use `gcloud auth application-default login --client-id-file=<downloaded-client.json> --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform`. The Cloud CLI requires the additional `cloud-platform` scope; the MCP's tools remain read-only. For an External app in Testing, add your Analytics Google account as a test user. The downloaded client JSON starts the sign-in flow; the resulting ADC file is the credential used by the MCP. See [Google's troubleshooting guidance](https://docs.cloud.google.com/docs/authentication/troubleshoot-adc#access-blocked-when-using-scopes).

While the OAuth app remains in Testing, Google expires test-user authorization after seven days; repeat the client-specific sign-in when reauthorization is needed. This affects MCP report access, not the site's GA4 tag. See [Google's audience settings](https://support.google.com/cloud/answer/15549945?hl=en).
