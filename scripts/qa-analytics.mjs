import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve('.astro/analytics-qa')
await mkdir(out, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.pdf': 'application/pdf' }
const server = createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://local').pathname)
    if (path.endsWith('/')) path += 'index.html'
    const file = resolve('dist', '.' + path)
    if (!file.startsWith(resolve('dist') + sep)) throw Error('outside dist')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const local = `http://127.0.0.1:${server.address().port}`
// This hostname is intercepted in full: QA never sends data to real providers.
const origin = 'https://qa.ch1mple.id.vn'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = [], providerRequests = []

async function context({ configured = true, clarityDelay = 0, ...options } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options })
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === origin) {
      const response = await ctx.request.get(local + url.pathname + url.search)
      if (url.pathname === '/') {
        let body = await response.text()
        body = body.replace(/data-clarity-id(?:="[^"]*"|(?=\s))/, configured ? 'data-clarity-id="qa12345"' : 'data-clarity-id')
        await route.fulfill({ response, body })
      } else await route.fulfill({ response })
    } else if (url.origin === local) await route.continue()
    else {
      providerRequests.push(url.href)
      if (url.hostname === 'www.clarity.ms' && url.pathname.startsWith('/tag/')) {
        if (clarityDelay) await new Promise(done => setTimeout(done, clarityDelay))
        // Emulate the SDK's stopped queue and denied-consent restart. No data leaves QA.
        await route.fulfill({ contentType: 'application/javascript', body: `
          setTimeout(() => {
          window.__clarityCalls = []; window.__clarityActive = true; window.__clarityRestarts = 0;
          document.cookie = '_clck=bootstrap; Path=/'; document.cookie = '_clsk=bootstrap; Domain=ch1mple.id.vn; Path=/';
          function queue() { const queued = (...args) => { (queued.q ||= []).push(args); if (args[0] === 'start') { queued.q.unshift(queued.q.pop()); process(); } }; window.clarity = queued; }
          function command(...args) {
            window.__clarityCalls.push(args);
            if (args[0] === 'metadata' && window.__clarityActive) args[1]();
            if (args[0] === 'start') window.__clarityActive = true;
            if (args[0] === 'stop' && window.__clarityActive) { window.__clarityActive = false; queue(); }
            if (args[0] === 'consentv2' && args[1].analytics_Storage === 'denied' && window.__clarityActive) {
              window.__clarityActive = false; queue(); setTimeout(() => { window.__clarityRestarts++; window.__clarityActive = true; process(); }, 50);
            }
          }
          function process() { const calls = window.clarity.q || []; window.clarity = command; while (calls.length) window.clarity(...calls.shift()); }
          process();
          }, 25);
        ` })
      } else if (url.hostname === 'www.googletagmanager.com') await route.fulfill({ contentType: 'application/javascript', body: '/* offline GA provider */' })
      else await route.abort()
    }
  })
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)))
  return ctx
}
async function open(ctx, url = origin) {
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.site-intro').waitFor({ state: 'detached' })
  return page
}
const eventCount = (page, name) => page.evaluate(name => (window.dataLayer || []).filter(call => call[0] === 'event' && call[1] === name).length, name)
const lastEvent = (page, name) => page.evaluate(name => (window.dataLayer || []).filter(call => call[0] === 'event' && call[1] === name).at(-1)?.[2], name)
async function waitEvent(page, name, count = 1) {
  await page.waitForFunction(({ name, count }) => (window.dataLayer || []).filter(call => call[0] === 'event' && call[1] === name).length >= count, { name, count })
}

try {
  const ctx = await context()
  const page = await open(ctx)
  const panel = page.locator('[data-recording-panel]')
  assert.equal(await panel.isVisible(), true)
  assert.equal(providerRequests.filter(url => url.includes('clarity.ms')).length, 0, 'no recording script before opt-in')
  await page.locator('[data-recording-deny]').click()
  assert.equal(await panel.isVisible(), false)
  assert.equal(await page.locator('[data-recording-toggle]').evaluate(el => document.activeElement === el), true, 'consent action returns focus')
  await page.reload({ waitUntil: 'load' })
  await page.locator('.site-intro').waitFor({ state: 'detached' })
  assert.equal(await panel.isVisible(), false, 'decline persists')
  assert.equal(providerRequests.filter(url => url.includes('clarity.ms')).length, 0)
  await page.locator('[data-recording-toggle]').click()
  await page.locator('[data-recording-allow]').click()
  await page.waitForFunction(() => Array.isArray(window.__clarityCalls))
  assert.equal(await page.evaluate(() => window.__clarityCalls[0][1].ad_Storage), 'denied', 'recording opt-in does not opt into ads')
  const second = await open(ctx)
  await second.waitForFunction(() => Array.isArray(window.__clarityCalls))
  await page.locator('[data-recording-toggle]').click()
  await page.locator('[data-recording-deny]').click()
  await second.waitForFunction(() => window.__clarityCalls.some(call => call[0] === 'stop'))
  await second.waitForTimeout(100)
  assert.equal(await second.evaluate(() => window.__clarityActive), false, 'revocation must not restart cookieless recording')
  assert.equal(await second.evaluate(() => window.__clarityRestarts), 0, 'revocation must not briefly restart recording before another stop')
  assert.equal(await second.locator('[data-recording-toggle]').textContent(), 'Recording: off', 'cross-tab revocation updates the control')
  await second.close()
  console.log('Consent QA passed: default off, persisted decline, explicit grant, ads denied, focus return and cross-tab revocation.')

  const trigger = page.locator('[data-open-project="oboxsteam"]')
  await trigger.click()
  await waitEvent(page, 'project_open')
  assert.equal((await lastEvent(page, 'project_open')).content_id, 'oboxsteam')
  await page.locator('[data-viewer-next]').click()
  await waitEvent(page, 'project_open', 2)
  assert.equal((await lastEvent(page, 'project_open')).content_id, 'graphpaper')
  await page.locator('[data-viewer-close]').click()
  await page.waitForFunction(() => !document.querySelector('#project-viewer').open)
  assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
  assert.equal(await page.evaluate(() => window.lenis.isStopped), false)

  await page.locator('[data-component-open="reverie"]').click()
  await waitEvent(page, 'component_open')
  const playground = page.locator('#component-playground')
  const code = playground.locator('[data-playground-tab="code"]')
  await code.focus()
  await page.keyboard.press('Enter')
  await waitEvent(page, 'component_view')
  const copy = playground.locator('[data-code-copy="html"]')
  await copy.waitFor({ state: 'visible' })
  await page.waitForFunction(() => !document.querySelector('[data-code-copy="html"]').disabled)
  await copy.click()
  await waitEvent(page, 'component_copy')
  const download = page.waitForEvent('download')
  await playground.locator('[data-code-download="html"]').click()
  assert.equal(await (await download).failure(), null)
  await waitEvent(page, 'component_download')
  await page.keyboard.press('Escape')
  assert.equal(await playground.evaluate(el => el.open), false)
  await page.locator('[data-open-resume]').click()
  await waitEvent(page, 'resume_open')
  const resumeDownload = page.waitForEvent('download')
  await page.locator('#resume-viewer [download]').click()
  await resumeDownload
  await waitEvent(page, 'resume_download')
  await page.keyboard.press('Escape')
  await page.evaluate(() => document.querySelector('a-work .a__btn').click())
  await waitEvent(page, 'goat_video_open')
  assert.equal((await lastEvent(page, 'goat_video_open')).content_id, 'ArcRaider', 'clip analytics uses the stable ID rather than the build hash')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('.js-vp').getAttribute('aria-hidden') === 'true')

  await page.locator('.js-menu-link[href="#builds"]').click()
  await waitEvent(page, 'navigation_click')
  await page.waitForFunction(() => (window.dataLayer || []).some(call => call[0] === 'event' && call[1] === 'section_view' && call[2].section_id === 'builds'))
  // Inspect payloads without following email/external destinations in QA.
  await page.evaluate(() => {
    const stop = event => event.preventDefault()
    document.addEventListener('click', stop)
    document.querySelector('a[href^="mailto:"]').click()
    document.querySelector('a[href="https://github.com/Ch1mpleo"]').click()
    document.removeEventListener('click', stop)
  })
  await waitEvent(page, 'contact_click')
  await waitEvent(page, 'outbound_click')
  const payloads = await page.evaluate(() => (window.dataLayer || []).filter(call => call[0] === 'event').map(call => call[2]))
  assert.equal(JSON.stringify(payloads).includes('@'), false)
  console.log('Interaction QA passed: project open/switch, component keyboard/code/copy/download, resume/download, GOAT stable IDs, navigation, sections, contact, outbound and modal focus/Lenis.')

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.locator('[data-recording-toggle]').click()
    for (const theme of ['light', 'dark']) {
      await page.evaluate(dark => document.documentElement.classList.toggle('theme-dark', dark), theme === 'dark')
      const box = await panel.boundingBox()
      assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0, `preference panel fits ${width}/${theme}`)
      await page.screenshot({ path: resolve(out, `preferences-${width}-${theme}.png`) })
    }
    await page.locator('[data-recording-deny]').focus()
    await page.keyboard.press('Escape')
    assert.equal(await panel.isVisible(), false)
    assert.equal(await page.locator('[data-recording-toggle]').evaluate(el => document.activeElement === el), true)
  }
  await page.evaluate(() => { window.gtag = () => { throw Error('blocked provider') } })
  await page.locator('[data-open-resume]').click()
  assert.equal(await page.locator('#resume-viewer').evaluate(el => el.open), true, 'blocked GA cannot break a viewer')
  await page.keyboard.press('Escape')
  await ctx.close()

  const slow = await context({ clarityDelay: 1000 })
  const slowPage = await open(slow)
  await slowPage.evaluate(() => {
    const allow = document.querySelector('[data-recording-allow]'), deny = document.querySelector('[data-recording-deny]'), toggle = document.querySelector('[data-recording-toggle]')
    allow.click(); toggle.click(); deny.click(); toggle.click(); allow.click(); toggle.click(); deny.click()
  })
  await slowPage.waitForFunction(() => Array.isArray(window.__clarityCalls))
  assert.equal(await slowPage.evaluate(() => window.__clarityActive), false, 'late bootstrap honors rapid grant/revoke decisions')
  assert.equal(await slowPage.evaluate(() => /_clck=|_clsk=/.test(document.cookie)), false, 'late runtime startup cannot leave cookies after revoke')
  await slowPage.locator('[data-recording-toggle]').click()
  await slowPage.locator('[data-recording-allow]').click()
  await slowPage.waitForFunction(() => window.__clarityActive === true)
  await slowPage.evaluate(() => { document.cookie = '_clck=qa; Path=/'; document.cookie = '_clsk=qa; Domain=ch1mple.id.vn; Path=/' })
  await slowPage.locator('[data-recording-toggle]').click()
  await slowPage.locator('[data-recording-deny]').click()
  assert.equal(await slowPage.evaluate(() => /_clck=|_clsk=/.test(document.cookie)), false, 'revocation expires Clarity cookies at both domain scopes')
  await slowPage.setViewportSize({ width: 1440, height: 340 })
  await slowPage.locator('[data-recording-toggle]').click()
  const shortPanel = slowPage.locator('[data-recording-panel]')
  assert.equal(await shortPanel.evaluate(el => el.scrollHeight > el.clientHeight), true, 'short viewport exercises an overflowing panel')
  await shortPanel.hover()
  const backgroundPosition = await slowPage.evaluate(() => window.scrollY)
  await slowPage.mouse.wheel(0, 500)
  await slowPage.waitForFunction(() => document.querySelector('[data-recording-panel]').scrollTop > 0, null, { timeout: 5000 })
  assert.equal(await slowPage.evaluate(() => window.scrollY), backgroundPosition, 'short consent panel scrolls independently of Lenis')
  await slowPage.screenshot({ path: resolve(out, 'preferences-short-viewport.png') })
  await slow.close()
  console.log('Lifecycle QA passed: delayed bootstrap, rapid choices, regrant, full stop without restart, cookie cleanup and short-height panel scrolling.')

  const noId = await context({ configured: false })
  const withoutId = await open(noId)
  assert.equal(await withoutId.locator('[data-recording-preferences]').isVisible(), false, 'missing Clarity ID disables recording UI')
  await noId.close()
  const beforeLocal = providerRequests.length
  const localContext = await context()
  const localPage = await open(localContext, local)
  assert.equal(await localPage.locator('[data-recording-preferences]').isVisible(), false)
  assert.equal(await localPage.evaluate(() => window.dataLayer), undefined)
  assert.equal(providerRequests.length, beforeLocal, 'local production preview sends no provider requests')
  await localContext.close()
  assert.deepEqual(errors, [])
  console.log('Analytics QA passed: desktop/phone, light/dark, reduced motion, Escape, blocked providers, missing ID and local preview; all external requests intercepted.')
} finally {
  await browser.close()
  server.close()
}
