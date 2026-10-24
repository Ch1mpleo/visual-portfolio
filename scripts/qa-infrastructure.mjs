import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve(process.env.INFRA_QA_OUT || '.astro/infrastructure-qa-v4')
await mkdir(out, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4' }
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/visual-portfolio/, '')
    const file = resolve('dist', '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(resolve('dist') + sep)) throw new Error('outside dist')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.end(await readFile(file))
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const url = `http://127.0.0.1:${server.address().port}/visual-portfolio/`
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
const errors = [], reports = []
page.on('pageerror', error => errors.push(error.message))
const closeInspection = async map => {
  if (await map.locator('[data-infra-bubble]').isVisible()) await map.locator('[data-infra-close]').click()
  await page.mouse.move(1, 1)
  await page.waitForTimeout(380)
}
const proof = async (map, name, width = 1440) => {
  const css = await page.locator('link[rel="stylesheet"]').evaluateAll(async links => (await Promise.all(links.map(link => fetch(link.href).then(r => r.text())))).join('\n'))
  const html = await map.evaluate(el => el.outerHTML)
  const mapWidth = await map.evaluate(el => el.getBoundingClientRect().width)
  const dark = await page.evaluate(() => document.documentElement.classList.contains('theme-dark'))
  const shell = `<html class="${dark ? 'theme-dark' : ''}"><head><base href="${url}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nbody{margin:0;background:var(--color-primary)}.arch-map{width:${mapWidth}px;max-width:none;box-sizing:border-box;margin:auto}</style></head><body>${html}</body></html>`
  const tab = await browser.newPage({ viewport: { width, height: 1400 }, reducedMotion: 'reduce' })
  await tab.setContent(shell, { waitUntil: 'load' }); await tab.evaluate(() => document.fonts.ready)
  await tab.locator('.arch-map').screenshot({ path: resolve(out, `${name}.png`) })
  await writeFile(resolve(out, `${name}.html`), shell.replace(`<base href="${url}">`, ''))
  await tab.close(); await page.bringToFront()
}
try {
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('[data-open-project="oboxsteam"]').click()
  for (const [index, project] of ['oboxsteam', 'graphpaper', 'museums'].entries()) {
    if (index) await page.locator('[data-viewer-next]').click()
    const map = page.locator(`#viewer-${project} [data-arch-map]`)
    await map.locator('.infra-toolbar').scrollIntoViewIfNeeded()
    const buttons = map.locator('[data-arch-select]')
    assert.equal(await map.locator('[data-infra-play]').count(), 1, 'one flow control')
    assert.equal(await map.locator('[data-infra-zoom], [data-infra-flow], .infra-zone, .infra-selectors, .infra-bubble__connections').count(), 0, 'no secondary graph chrome')
    assert.ok(await buttons.count() <= 4)
    for (let i = 0; i < await buttons.count(); i++) {
      await closeInspection(map)
      const button = buttons.nth(i)
      await button.click()
      const id = await button.getAttribute('data-arch-select')
      assert.equal(await map.locator('[data-arch-select][aria-pressed="true"]').count(), 1)
      assert.equal(await map.locator(`[data-arch-panel="${id}"]`).isVisible(), true)
      assert.equal(await map.locator(`[data-infra-part="${id}"].is-selected`).count(), 1)
      const bounds = await map.locator('[data-infra-bubble]').boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 1441)
      await button.click()
      assert.equal(await map.locator(`[data-arch-panel="${id}"]`).isVisible(), true, 'clicking the selected part again keeps its inspection open')
      assert.equal(await map.locator('[data-infra-pin] svg').evaluate(el => el.getAnimations().length), 0, 'component clicks respect reduced motion')
    }
    await closeInspection(map)
    const defaults = { oboxsteam: 'api', graphpaper: 'analysis', museums: 'foundation' }
    await map.locator(`[data-arch-select="${defaults[project]}"]`).click()
    await page.screenshot({ path: resolve(out, `${project}-bubble.png`) })
    assert.equal(await map.locator('[data-infra-next], [data-infra-previous], [data-infra-count], .infra-bubble__footer').count(), 0, 'inspect parts directly on the anatomy')
    await map.locator('[data-infra-pin]').click()
    assert.equal(await map.locator('[data-infra-pin]').getAttribute('aria-pressed'), 'false')
    await map.locator('[data-infra-pin]').click()
    assert.equal(await map.locator('[data-infra-pin] svg').count(), 1, 'pin label updates preserve the icon')
    assert.equal(await map.locator('[data-infra-pin] svg').evaluate(el => el.getAnimations().length), 0, 'reduced motion skips the pin press')
    await page.mouse.move(1, 1); await page.waitForTimeout(380)
    assert.equal(await map.locator('[data-infra-bubble]').isVisible(), true, 'pinned bubble survives pointer leave')
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('#project-viewer').evaluate(el => el.open), true)
    await page.locator('[data-viewer-close]').evaluate(el => el.focus({ preventScroll: true }))
    await page.mouse.move(1, 1); await page.waitForTimeout(380)
    await buttons.first().hover(); await page.waitForTimeout(260)
    assert.equal(await buttons.first().getAttribute('aria-expanded'), 'true', 'intentional hover opens inspection')
    await map.locator('[data-infra-bubble]').hover()
    await page.waitForTimeout(380)
    assert.equal(await map.locator('[data-infra-bubble]').isVisible(), true, 'pointer can travel from a part into its bubble')
    await page.mouse.move(1, 1); await page.waitForTimeout(380)
    assert.equal(await map.locator('[data-infra-bubble]').isVisible(), false)
    for (const theme of ['light', 'dark']) {
      await page.evaluate(dark => document.documentElement.classList.toggle('theme-dark', dark), theme === 'dark')
      await proof(map, `${project}-${theme}`)
      await map.locator(`[data-arch-select="${defaults[project]}"]`).click()
      await page.screenshot({ path: resolve(out, `${project}-${theme}-bubble.png`) })
      await closeInspection(map)
    }
    await page.evaluate(() => document.documentElement.classList.remove('theme-dark'))
    await buttons.first().press('End')
    assert.equal(await buttons.last().getAttribute('aria-expanded'), 'true')
    await buttons.last().press('Home')
    assert.equal(await buttons.first().getAttribute('aria-expanded'), 'true')
    await closeInspection(map)
    await map.locator('[data-infra-play]').click()
    assert.equal(await map.locator('.infra-trace.is-active').count(), await map.locator('[data-infra-edge]').count(), 'reduced motion highlights the complete path')
    assert.equal(await map.locator('.infra-contact').evaluateAll(items => items.every(item => item.getAttribute('opacity') === '0')), true)
    await map.locator('[data-infra-play]').click()
    for (const width of [390, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      await map.locator('.infra-toolbar').scrollIntoViewIfNeeded()
      await page.waitForTimeout(100)
      assert.equal(await map.getAttribute('data-layout'), await map.locator('[data-infra-viewport]').evaluate(el => el.clientWidth < 900 ? 'stacked' : 'wide'))
      await buttons.first().click()
      const bubble = await map.locator('[data-infra-bubble]').boundingBox()
      assert.ok(bubble.x >= 0 && bubble.x + bubble.width <= width + 1)
      await page.screenshot({ path: resolve(out, `${project}-${width}-bubble.png`) })
      if (await map.getAttribute('data-layout') === 'stacked') {
        for (let i = 0; i < await buttons.count(); i++) {
          if (i) { await closeInspection(map); await buttons.nth(i).click() }
          const selected = map.locator('[data-arch-select][aria-expanded="true"]')
          const anchor = await selected.boundingBox(), detail = await map.locator('[data-infra-bubble]').boundingBox()
          assert.ok(detail.y + detail.height <= anchor.y + 1 || detail.y >= anchor.y + anchor.height - 1, 'the mobile bubble leaves its selected part visible')
        }
      }
      await closeInspection(map)
      await map.locator('.infra-toolbar').scrollIntoViewIfNeeded()
      await proof(map, `${project}-${width}`, width)
      assert.equal(await map.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true)
      assert.equal(await map.locator('[data-infra-viewport]').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'every part fits without horizontal panning')
      assert.equal(await map.locator('.infra-node__plate').evaluateAll(plates => plates.every(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= el.closest('[data-infra-viewport]').getBoundingClientRect().right + 1)), true, 'all labels stay readable and inside the figure')
      const first = await buttons.first().boundingBox(), last = await buttons.last().boundingBox()
      if (await map.getAttribute('data-layout') === 'stacked') assert.ok(last.y > first.y, 'narrow layout retains reading order')
    }
    await page.setViewportSize({ width: 1440, height: 1100 })
    reports.push({ project, parts: await buttons.count(), checked: ['every inspection', 'hover intent and bubble entry', 'pin/unpin', 'direct anatomy selection', 'Escape', 'keyboard', 'static flow', 'both themes', '390/768/1024 widths', 'no horizontal panning'] })
  }
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#project-viewer').evaluate(el => el.open), false)
  assert.equal(await page.locator('[data-open-project="oboxsteam"]').evaluate(el => el === document.activeElement), true)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('[data-open-project="oboxsteam"]').click(); await page.waitForTimeout(800)
  const map = page.locator('#viewer-oboxsteam [data-arch-map]')
  await map.locator('.infra-toolbar').scrollIntoViewIfNeeded()
  await map.locator('[data-arch-select="api"]').click()
  const pin = map.locator('[data-infra-pin]'), pinIcon = pin.locator('svg')
  const componentPress = await pinIcon.evaluateHandle(el => el.getAnimations().find(animation => animation.animationName === 'infra-pin-press'))
  assert.equal(await componentPress.evaluate(animation => Boolean(animation)), true, 'clicking an anatomy component plays the pin press')
  await map.locator('[data-arch-select="api"]').click()
  assert.equal(await pinIcon.evaluate((el, previous) => {
    const current = el.getAnimations().find(animation => animation.animationName === 'infra-pin-press')
    return Boolean(current && current !== previous)
  }, componentPress), true, 'clicking the selected component again replays the pin press')
  await componentPress.dispose()
  await pin.click(); await pin.click()
  assert.equal(await pin.getAttribute('aria-pressed'), 'true')
  const press = await pinIcon.evaluate(el => {
    const motion = el.getAnimations().find(animation => animation.animationName === 'infra-pin-press')
    if (!motion) return null
    const settle = el.closest('[data-infra-pin]').getAnimations().find(animation => animation.animationName === 'infra-pin-settle')
    motion.pause(); motion.currentTime = 0
    const start = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    const staysInPlace = [0, 60, 100, 160, 240, 330].every(time => {
      motion.currentTime = time
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return Math.abs(matrix.m41) < .01 && Math.abs(matrix.m42) <= 4.01 && getComputedStyle(el).opacity === '1'
    })
    motion.currentTime = 80
    if (settle) { settle.pause(); settle.currentTime = 80 }
    return { transform: getComputedStyle(el).transform, staysInPlace, startsAtUnpinnedTilt: start.m12 < 0 && start.m41 === 0 && start.m42 === 0, duration: motion.effect.getTiming().duration, hasButtonSettle: Boolean(settle) }
  })
  assert.ok(press, 'existing pin presses into the button on click')
  assert.ok(press.startsAtUnpinnedTilt, 'press begins at the existing unpinned pose')
  assert.ok(press.staysInPlace, 'pin stays visible in its original slot with only a small vertical press')
  assert.equal(press.duration, 360, 'press and recoil settle quickly')
  assert.equal(press.hasButtonSettle, true)
  await page.screenshot({ path: resolve(out, 'pin-turn.png') })
  const impact = await pinIcon.evaluate(el => {
    const motion = el.getAnimations().find(animation => animation.animationName === 'infra-pin-press')
    motion.currentTime = 180
    const button = el.closest('[data-infra-pin]')
    button.getAnimations().find(animation => animation.animationName === 'infra-pin-settle').currentTime = 180
    const icon = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    const recoil = new DOMMatrixReadOnly(getComputedStyle(button).transform)
    return { transform: getComputedStyle(el).transform, downward: Math.abs(icon.m12) < .01 && icon.m42 > 2.5, recoil: recoil.m42 > 1 }
  })
  assert.notEqual(press.transform, impact.transform, 'pin turns down and presses into the button')
  assert.ok(impact.downward, 'pin points straight down at impact')
  assert.ok(impact.recoil, 'button recoils downward at impact')
  await page.screenshot({ path: resolve(out, 'pin-impact.png') })
  await pinIcon.evaluate(el => el.getAnimations().forEach(animation => animation.finish()))
  await page.waitForTimeout(50)
  assert.equal(await pin.evaluate(el => el.classList.contains('is-pinning')), false)
  for (let i = 0; i < 4; i++) await pin.click()
  await page.waitForTimeout(650)
  assert.equal(await pin.getAttribute('aria-pressed'), 'true', 'rapid toggles settle in the correct state')
  assert.equal(await pin.evaluate(el => el.classList.contains('is-pinning')), false)
  await pin.click(); await pin.click()
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100)
  assert.equal(await pinIcon.evaluate(el => el.getAnimations().length), 0, 'enabling reduced motion cancels an active press')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await closeInspection(map)
  await map.locator('[data-infra-play]').click()
  await page.mouse.move(1, 1); await page.waitForTimeout(400)
  const contact = map.locator('[data-infra-edge="clients-api"] .infra-contact')
  const position = await contact.getAttribute('transform')
  await page.waitForTimeout(400)
  assert.notEqual(await contact.getAttribute('transform'), position)
  await page.screenshot({ path: resolve(out, 'motion-1.png') }); await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(out, 'motion-2.png') })
  await map.locator('[data-infra-play]').click()
  assert.equal(await map.locator('.infra-contact').evaluateAll(items => items.every(item => item.getAttribute('opacity') === '0')), true)
  await map.locator('[data-infra-play]').click(); await page.mouse.move(1, 1); await page.waitForTimeout(350)
  await page.locator('[data-viewer-scroller]').evaluate(el => { el.scrollTop = 0 })
  await page.waitForTimeout(150)
  assert.equal(await map.locator('.infra-contact').evaluateAll(items => items.every(item => item.getAttribute('opacity') === '0')), true)
  await map.locator('.infra-toolbar').scrollIntoViewIfNeeded(); await page.waitForTimeout(6500)
  assert.equal(await map.locator('[data-play-label]').innerText(), 'Replay flow', 'one finite tour, no perpetual loop')
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100)
  assert.equal(await map.locator('.infra-contact').evaluateAll(items => items.every(item => item.getAttribute('opacity') === '0')), true)
  await page.keyboard.press('Escape')
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'report.json'), JSON.stringify({ reports, errors }, null, 2))
  console.log(JSON.stringify({ reports, errors, out }, null, 2))
} finally { await browser.close(); server.close() }
