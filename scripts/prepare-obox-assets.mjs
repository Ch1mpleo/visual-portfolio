import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Preserve the supplied captures; serve smaller WebP variants in the viewer.
const folder = new URL('../public/builds/oboxsteam/', import.meta.url)
await mkdir(new URL('generated/', folder), { recursive: true })
for (const name of ['hero-section', 'curriculum-creation', 'curriculum', 'portfolio']) {
  for (const width of name === 'hero-section' ? [1600] : [960, 1600]) {
    await sharp(fileURLToPath(new URL(`${name}.png`, folder)))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toFile(fileURLToPath(new URL(`generated/${name}-${width}.webp`, folder)))
  }
}
