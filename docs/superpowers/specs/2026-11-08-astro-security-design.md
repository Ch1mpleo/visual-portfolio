# Astro security migration

Upgrade this static GitHub Pages portfolio from Astro 5.18.2 to the current stable Astro 7.4.7 to resolve the five reported dependency vulnerabilities. Preserve the design, animations, component demos, resume viewer, and `/visual-portfolio/` production base.

Use Node 22.23.4 for verification and CI, record that version for local development, and declare Astro's minimum Node/npm requirements. Keep development bound to localhost by default. Preserve Astro 5 whitespace behavior with `compressHTML: true`.

## Approaches

The user authorized a deliberate major-version migration after discussion of `npm audit fix --force`. Upgrade Astro directly and regenerate the lockfile; do not force npm's resolver or override transitive dependencies. Staying on Astro 5 leaves the reported vulnerabilities unresolved. Update only tooling required by the migration.

## Acceptance

- Clean install, production build, existing unit tests, and npm audit succeed on the declared Node version.
- Production asset paths, optimized images, component source highlighting, and representative desktop/mobile interactions still work.
- Leave the work on `chore/astro-security-update` for review; no deployment or merge.
