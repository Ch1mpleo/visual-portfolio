# Astro Security Update Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the reported dependency vulnerabilities while retaining the static portfolio's behavior.

**Architecture:** Upgrade Astro and its dependency graph directly. Align Node requirements and Pages CI, preserve HTML whitespace, and use existing unit/browser checks to detect migration regressions.

**Tech Stack:** Astro 7.4.7, Node 22.23.4, npm, SCSS, GSAP, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-08-astro-security-design.md`

## Global Constraints

- Work on `chore/astro-security-update`; retain `/visual-portfolio/` and static output.
- Node >=22.23.4; npm >=9.6.5. Verify using Node 22.23.4.
- No forced dependency resolutions, unrelated redesign, merge, or deployment.

## Review Focus

- Pages CI must use a Node version compatible with Astro.
- TypeScript must remain available to existing unit tests after Astro drops it from its dependency graph.
- Whitespace and SCSS compilation must preserve the page's appearance.
- Asset, iframe, and highlighted-source paths must work under the production base.
- Native compiler/image packages must install from the regenerated lockfile.

## Task 1: Dependencies and runtime

**Files:** `package.json`, `package-lock.json`, `.nvmrc`, `astro.config.mjs`, `.github/workflows/deploy.yml`, `README.md`.

- [x] Establish baseline: `node --test tests/*.test.mjs` passes 30 tests; `npm run build` builds three pages; `npm audit` reports five vulnerabilities.
- [x] Install Astro 7.4.7 using Node 22.23.4. Declare TypeScript explicitly if the existing tests no longer receive it transitively.
- [x] Declare Node/npm engines and local Node version; align Pages action's `node-version`.
- [x] Preserve whitespace behavior and default to localhost. Document setup and verification commands.
- [x] Run clean install, existing tests, build, and audit. Fix only demonstrated migration failures.

## Task 2: Browser verification and review

**Files:** Change application code only if verification identifies a migration regression.

- [x] Run existing production browser checks for components and resume; inspect desktop/mobile output and optimized images.
- [x] Review the final diff and dependency graph, resolve material findings, and record verification results.
- [x] Report branch, versions, checks, and any local Node setup needed. Leave changes available for review.

## Verification results

- Runtime: temporary Node 22.23.4, npm 10.9.2. The system-wide Node 22.17.1 installation was not changed and must be upgraded before using the updated Astro normally.
- Clean `npm ci`: passed, 223 installed packages. `npm audit`: zero vulnerabilities. Astro 7.4.7, Sharp 0.35.5, Zod 4.6.7; esbuild and the old vulnerable Zod-to-TS dependency are absent.
- `npm test`: 30 passed after clean install. The initial migration reproduced missing TypeScript; declaring the same previously transitive 5.5.4 version fixed it.
- `npm run build`: passed, three static pages and the optimized WebP generated. The existing Sass `mixed-decls` deprecation warning remains, also present in the Astro 5 baseline.
- Development HTTP smoke test: 200 response with the page title and Vite client on localhost. Production preview and optimized image decoding passed.
- Production browser QA: resume (seven widths, themes, focus, zoom, original PDF and downloads), music, and all three project infrastructure views passed. Resume's initial PDF popup check timed out under concurrent browser load; its separate rerun passed.
- Components QA passed responsive navigation/layout at seven widths, deferred demos/source, highlighted code, exact copy/download, split exports, reduced motion, and Emulsion sequence checks. The complete suite did not pass: two runs reached different transient Cutout animation assertions (photo element count and recoil sampling).
- Targeted standalone Cutout check captured phase changes atomically and passed: four photo faces during `developed` and `unpacking`, then zero after the handoff. Cutout source is unchanged from the branch base and is copied verbatim into production; no demo or animation code was changed in this migration. The broader animation QA remains a known timing-sensitive limitation.
- Independent read-only review found no actionable issues; Linux native compiler, bundler, and image dependencies are in the lockfile. Ubuntu GitHub Actions was not executed locally.
- `git diff --check`: passed. Work remains on `chore/astro-security-update`, without merge or deployment.
