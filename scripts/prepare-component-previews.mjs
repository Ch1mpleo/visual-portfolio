import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const sharp = require('sharp')
const origin = process.env.COMPONENT_PREVIEW_ORIGIN || 'http://127.0.0.1:4321/'
const output = resolve('public/components/previews')
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8').catch(() => '{}'))
const ids = ['cutout', 'emulsion', 'reverie']
const selected = process.env.COMPONENT_PREVIEW_IDS?.split(',').map(id => id.trim()) || ids
if (selected.some(id => !ids.includes(id))) throw new Error('Unknown component preview ID')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
  const page = await browser.newPage({viewport:{width:1200,height:800},reducedMotion:'reduce'})
  for (const id of selected) {
    await page.goto(new URL(`components/${id}.html`,origin).href,{waitUntil:'load'})
    if (id === 'cutout') await page.locator('[data-sticker]').evaluateAll(images => Promise.all(images.map(img => img.decode())))
    if (id === 'emulsion') await page.locator('.print img').evaluateAll(images => Promise.all(images.slice(0,3).map(img => img.decode())))
    if (id === 'reverie') {
      await page.locator('.scene').press('Home')
      for (let step = 0; step < 3; step++) await page.locator('.scene').press('PageDown')
      await page.locator('.rv-card img').evaluateAll(images => Promise.all(images.slice(0,8).map(img => img.decode())))
    }
    await page.mouse.move(0,0)
    const preview = await sharp(await page.screenshot()).webp({quality:88}).toBuffer()
    await writeFile(resolve(output,`${id}.webp`),preview)
    manifest[id] = createHash('sha256').update(preview).digest('hex').slice(0,10)
    console.log(`Saved ${id}.webp`)
  }
  await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
} finally { await browser.close() }
