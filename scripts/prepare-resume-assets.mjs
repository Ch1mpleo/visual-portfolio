// Optional asset preparation: npm install --no-save pdfjs-dist @napi-rs/canvas
// Package overrides also let this run with an existing tool runtime.
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const { createCanvas, DOMMatrix, ImageData, Path2D } = require(process.env.CANVAS_PACKAGE || '@napi-rs/canvas')
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D })
const { getDocument } = await import(process.env.PDFJS_PACKAGE || 'pdfjs-dist/legacy/build/pdf.mjs')
const folder = new URL('../public/documents/', import.meta.url)
const pdf = await getDocument({ data: new Uint8Array(await readFile(new URL('resume.pdf', folder))), useSystemFonts: true }).promise
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  await writeFile(new URL(`resume-page-${i}.webp`, folder), canvas.toBuffer('image/webp', 90))
  console.log(`Prepared resume page ${i}/${pdf.numPages}`)
}
await pdf.destroy()
