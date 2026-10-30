import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve('.astro/resume-qa')
await mkdir(out, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.pdf': 'application/pdf' }
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/visual-portfolio/, '')
    const file = resolve('dist', '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(resolve('dist') + sep)) throw new Error('outside dist')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const url = `http://127.0.0.1:${server.address().port}/visual-portfolio/`
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.site-intro').waitFor({ state: 'detached' })
  const trigger = page.locator('[data-open-resume]')
  const dialog = page.locator('#resume-viewer')
  assert.equal(await dialog.locator('img[src]').count(), 0, 'preview does not load until requested')
  for (const width of [320, 390, 576, 768, 987, 1080, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await trigger.click()
    assert.equal(await dialog.evaluate(el => el.open), true)
    assert.equal(await page.evaluate(() => window.lenis.isStopped), true)
    await dialog.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
    assert.equal(await dialog.locator('img').count(), 2)
    const bounds = await dialog.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `dialog fits ${width}`)
    const controls = await page.locator('.site-head a:visible, .site-head button:visible').evaluateAll(items => items.map(el => ({ text: el.textContent.trim(), x: el.getBoundingClientRect().x, right: el.getBoundingClientRect().right })))
    assert.ok(controls.every(rect => rect.x >= 0 && rect.right <= width), `header controls fit ${width}: ${JSON.stringify(controls)}`)
    assert.equal(await dialog.locator('.resume-viewer__toolbar').evaluate(el => el.scrollWidth <= el.clientWidth), true, `toolbar fits ${width}`)
    assert.equal(await dialog.locator('.resume-viewer__document').evaluate(el => el.scrollWidth <= el.clientWidth), true, `preview fits ${width}`)
    assert.equal(await dialog.evaluate(el => el.getAnimations().length), 0, 'respects reduced motion')
    const zoom = dialog.locator('.resume-viewer__zoom')
    await zoom.click()
    assert.equal(await zoom.getAttribute('aria-pressed'), 'true')
    await dialog.getByRole('button', { name: 'Fit resume to width' }).click()
    await page.screenshot({ path: resolve(out, `resume-${width}.png`) })
    await page.keyboard.press('Escape')
    assert.equal(await dialog.evaluate(el => el.open), false)
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
    assert.equal(await page.evaluate(() => window.lenis.isStopped), false)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => document.documentElement.classList.add('theme-dark'))
  await trigger.click()
  await page.screenshot({ path: resolve(out, 'resume-dark.png') })
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('link', { name: 'Download', exact: true }).click()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), 'Viet-Anh-Resume.pdf')
  assert.equal(await download.failure(), null)
  const popupPromise = page.waitForEvent('popup')
  await dialog.getByRole('link', { name: 'Open resume PDF in a new tab' }).click()
  const popup = await popupPromise
  assert.ok(popup.url().includes('/visual-portfolio/documents/resume.pdf'))
  await popup.close()
  await dialog.getByRole('button', { name: 'Close resume' }).click()
  await trigger.click()
  await page.mouse.click(5, 5)
  assert.equal(await dialog.evaluate(el => el.open), false, 'backdrop dismisses')
  const pdf = await page.request.get(new URL('documents/resume.pdf', url).href)
  assert.equal(pdf.status(), 200)
  assert.deepEqual(await pdf.body(), await readFile('public/documents/resume.pdf'))
  assert.deepEqual(errors, [])
  console.log('Resume QA passed: 7 widths, light/dark, two-page preview, zoom, Escape, focus/scroll restoration, close/backdrop, original PDF, new tab and download.')
} finally {
  await browser.close()
  server.close()
}
