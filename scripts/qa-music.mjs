import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve('.astro/music-qa')
await mkdir(out, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' }
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname)
    const file = resolve('dist', '.' + (path === '/' ? '/index.html' : path))
    if (!file.startsWith(resolve('dist') + sep)) throw new Error('outside dist')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    const bytes = await readFile(file)
    response.setHeader('Accept-Ranges', 'bytes')
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '')
    if (range) {
      const start = Number(range[1])
      const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
      if (start > end || start >= bytes.length) {
        response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` })
        response.end()
        return
      }
      response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 })
      response.end(bytes.subarray(start, end + 1))
    } else {
      response.setHeader('Content-Length', bytes.length)
      response.end(bytes)
    }
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const url = process.env.MUSIC_QA_URL || `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  page.setDefaultTimeout(15000)
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext
    window.AudioContext = class extends NativeContext {
      createGain() {
        const gain = super.createGain()
        const meter = super.createAnalyser()
        meter.fftSize = 256
        gain.connect(meter)
        window.musicTest = { gain, meter }
        return gain
      }
    }
  })
  const errors = []
  const externalMusicRequests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (/spotify|scdn\.co/.test(request.url())) externalMusicRequests.push(request.url())
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.site-intro').waitFor({ state: 'detached' })

  const player = page.locator('[data-music-player]')
  const toggle = page.locator('[data-music-toggle]')
  const deckPlay = page.locator('[data-music-deck-play]')
  const panel = page.locator('#music-player-panel')
  const stage = page.locator('[data-music-stage]')
  const caption = page.locator('.music-player__caption')
  const status = page.locator('[data-music-status]')
  const disc = page.locator('.music-player__disc')
  const knob = page.getByRole('slider', { name: 'Music volume' })
  const platter = page.getByRole('slider', { name: 'Record position' })
  const cue = page.locator('[data-music-cue]')
  const tonearm = page.locator('.music-player__tonearm')

  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'audio starts off')
  assert.equal(await panel.evaluate(el => el.inert), true, 'collapsed controls are not focusable')
  assert.equal(await page.locator('[data-music-audio]').getAttribute('src'), null, 'audio loads on demand')
  assert.equal(await page.locator('[data-music-platter]').getAttribute('aria-disabled'), 'true', 'seeking disabled before metadata loads')
  assert.equal(await player.locator('.music-player__indicator').count(), 0, 'vinyl trigger has no status dot')
  assert.equal(await toggle.evaluate(el => getComputedStyle(el).borderTopWidth), '0px', 'vinyl trigger has no outer border')
  assert.equal(await caption.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'caption has no background box')

  // Hover vinyl trigger to float turntable in, then hover turntable to verify scale-up zoom + open lid
  await toggle.hover()
  await page.waitForFunction(() => parseFloat(document.querySelector('[data-music-player]').style.getPropertyValue('--lid-angle') || '0') > 45)
  assert.equal(await panel.locator('iframe, a').count(), 0, 'player has no external players or links')
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'hover never starts audio')
  const scaleOnTrigger = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--deck-scale-anim') || '0'))
  const lidOpen = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--lid-angle') || '0'))
  assert.ok(lidOpen > 45, `hinged acrylic dust cover swings open on float-in (got ${lidOpen.toFixed(1)}deg)`)

  const stageRect = await stage.boundingBox()
  await page.mouse.move(stageRect.x + stageRect.width * 0.5, stageRect.y + stageRect.height * 0.55)
  await page.waitForFunction((baseline) => parseFloat(document.querySelector('[data-music-player]').style.getPropertyValue('--deck-scale-anim') || '0') > baseline + 0.08, scaleOnTrigger)
  const scaleOnDeckHover = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--deck-scale-anim') || '0'))
  assert.ok(scaleOnDeckHover > scaleOnTrigger + 0.08, `hovering the turntable increases its size (${scaleOnTrigger.toFixed(2)} -> ${scaleOnDeckHover.toFixed(2)})`)

  const parkedArm = await tonearm.evaluate(el => getComputedStyle(el).transform)
  await page.screenshot({ path: resolve(out, 'desktop-light-hovered.png') })

  await deckPlay.click()
  await page.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime >= 1 && document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true', null, { timeout: 20000 })
  assert.equal(await status.textContent(), 'Now playing', 'full-song playback is reported')
  assert.equal(await platter.getAttribute('aria-disabled'), 'false', 'platter seeking becomes available')
  const realDuration = await page.locator('[data-music-audio]').evaluate(el => el.duration)
  assert.ok(realDuration > 240, 'loaded audio is the full song')
  console.log(`Full audio duration: ${realDuration.toFixed(2)} seconds`)
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationPlayState), 'running')
  assert.notEqual(await tonearm.evaluate(el => getComputedStyle(el).transform), parkedArm, 'play drops the 3D tonearm onto the record')
  await page.waitForFunction(() => Number(document.querySelector('[data-music-player]').style.getPropertyValue('--music-energy')) > .01)
  const firstRotation = await disc.evaluate(el => getComputedStyle(el).transform)
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(out, 'desktop-light-playing.png') })
  assert.notEqual(await disc.evaluate(el => getComputedStyle(el).transform), firstRotation, 'disc rotates during playback')

  // Verify real WebAudio output and 3D rotary knob keyboard + mute + vertical drag
  const outputLevel = () => page.evaluate(() => {
    const data = new Uint8Array(window.musicTest.meter.fftSize)
    window.musicTest.meter.getByteTimeDomainData(data)
    return data.reduce((sum, sample) => sum + Math.abs(sample - 128), 0) / data.length
  })
  assert.ok(await outputLevel() > 0, 'audio reaches output gain')
  await knob.focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  assert.equal(await knob.getAttribute('aria-valuenow'), '0')
  assert.equal(await knob.getAttribute('aria-valuetext'), '0 percent')
  assert.ok(await page.evaluate(() => window.musicTest.gain.gain.value) < .001, 'zero volume mutes gain')
  assert.equal(await outputLevel(), 0, 'zero volume produces silent output')
  await page.keyboard.press('End')
  await page.waitForTimeout(300)
  assert.equal(await knob.getAttribute('aria-valuenow'), '100')
  assert.ok(await page.evaluate(() => window.musicTest.gain.gain.value) > .99, 'full volume restores gain')
  assert.ok(await outputLevel() > 0, 'audio returns after unmuting')
  await page.keyboard.press('ArrowDown')
  assert.equal(await knob.getAttribute('aria-valuenow'), '99', 'rotary knob supports Arrow keys')

  await page.keyboard.press('PageDown')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('PageDown')
  const volumeBeforeGrab = await knob.getAttribute('aria-valuenow')
  const cap = page.locator('.fader__thumb-top')
  await cap.evaluate(el => Promise.all(el.parentElement.getAnimations().map(animation => animation.finished)))
  const capBounds = await cap.boundingBox()
  const gripX = capBounds.x + capBounds.width / 2
  const gripY = capBounds.y + capBounds.height * 0.72
  await page.mouse.move(gripX, gripY)
  await page.mouse.down()
  assert.equal(await knob.getAttribute('aria-valuenow'), volumeBeforeGrab, 'grabbing the cap off center keeps the current volume')
  const gimbal = page.locator('.music-player__gimbal')
  const dragPose = await gimbal.evaluate(el => getComputedStyle(el).transform)
  const rail = await knob.locator('[data-music-fader-stop]').evaluateAll(([top, bottom]) => {
    const a = top.getBoundingClientRect()
    const b = bottom.getBoundingClientRect()
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    return { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
  })
  const sideX = gripX - rail.y * 24
  const sideY = gripY + rail.x * 24
  await page.mouse.move(sideX, sideY, { steps: 6 })
  assert.equal(await knob.getAttribute('aria-valuenow'), volumeBeforeGrab, 'moving across the rail leaves volume steady')
  assert.equal(await gimbal.evaluate(el => getComputedStyle(el).transform), dragPose, 'the deck holds still during a drag')
  await page.mouse.move(sideX + rail.x * 25, sideY + rail.y * 25, { steps: 6 })
  await page.mouse.up()
  assert.ok(Number(await knob.getAttribute('aria-valuenow')) < Number(volumeBeforeGrab) - 10, 'dragging the cap moves volume down')

  // Verify direct drag on the 3D vertical volume fader slider
  const faderBounds = await knob.boundingBox()
  await page.mouse.move(faderBounds.x + faderBounds.width / 2, faderBounds.y + faderBounds.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(faderBounds.x + faderBounds.width / 2, faderBounds.y + faderBounds.height * 0.75, { steps: 6 })
  await page.mouse.up()
  const draggedVol = Number(await knob.getAttribute('aria-valuenow'))
  assert.ok(draggedVol < 45, `dragging 3D fader downward lowers volume directly (got ${draggedVol})`)

  // Pause via physical Start/Stop deck button
  await deckPlay.click()
  await page.waitForFunction(() => document.querySelector('[data-music-status]').textContent === 'Sound off')
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationPlayState), 'paused')

  // Keyboard seek via platter + circular platter drag
  await platter.focus()
  await page.keyboard.press('Home')
  const cueAtStart = await cue.evaluate(el => el.style.getPropertyValue('--cue-angle'))
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => Math.abs(document.querySelector('[data-music-audio]').currentTime - 10) < .4)
  assert.notEqual(await cue.evaluate(el => el.style.getPropertyValue('--cue-angle')), cueAtStart, 'seeking rotates record cue')
  assert.equal(await page.locator('[data-music-audio]').evaluate(el => el.paused), true, 'seeking while paused stays paused')

  const platterBounds = await platter.boundingBox()
  const cx = platterBounds.x + platterBounds.width / 2
  const cy = platterBounds.y + platterBounds.height / 2
  const r = platterBounds.width * .32
  const cueBeforeScratch = parseFloat(await cue.evaluate(el => el.style.getPropertyValue('--cue-angle') || '0'))
  await page.mouse.move(cx + r, cy)
  await page.mouse.down()
  await page.mouse.move(cx + r * .707, cy + r * .707, { steps: 4 })
  await page.mouse.move(cx, cy + r, { steps: 4 })
  await page.mouse.up()
  const cueAfterScratch = parseFloat(await cue.evaluate(el => el.style.getPropertyValue('--cue-angle') || '0'))
  assert.ok(cueAfterScratch - cueBeforeScratch > 65, `1:1 vinyl scratch rotates disc directly with hand (${(cueAfterScratch - cueBeforeScratch).toFixed(1)}deg)`)
  assert.ok(await page.locator('[data-music-audio]').evaluate(el => el.currentTime > 18), 'snappy 1:1 vinyl quarter-turn cues ~12s forward')

  // Verify 360-degree orbit drag on plinth + double-click reset
  const plinth = page.locator('[data-music-plinth]')
  const plinthBounds = await plinth.boundingBox()
  const orbitStartX = plinthBounds.x + plinthBounds.width * 0.08
  const orbitStartY = plinthBounds.y + plinthBounds.height * 0.12
  const ryBefore = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--deck-ry') || '0'))
  await page.mouse.move(orbitStartX, orbitStartY)
  await page.mouse.down()
  await page.mouse.move(orbitStartX + 220, orbitStartY - 60, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(260)
  const ryAfter = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--deck-ry') || '0'))
  assert.ok(Math.abs(ryAfter - ryBefore) > 70, `dragging plinth orbits turntable in 360 degrees (delta ${(ryAfter - ryBefore).toFixed(1)}deg)`)
  await page.screenshot({ path: resolve(out, 'desktop-light-orbited.png') })

  const stageBounds = await stage.boundingBox()
  await page.mouse.dblclick(stageBounds.x + 12, stageBounds.y + 12)
  await page.waitForTimeout(650)
  const ryReset = await player.evaluate(el => parseFloat(el.style.getPropertyValue('--deck-ry') || '0'))
  assert.ok(Math.abs(ryReset) < 12, `double-click resets orbit near resting angle (got ${ryReset.toFixed(1)}deg)`)

  // Audible video pauses music
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true')
  await page.evaluate(() => {
    const video = document.createElement('video')
    document.body.append(video)
    video.dispatchEvent(new Event('play'))
    video.remove()
  })
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'audible video pauses music')

  // Keyboard Tab order & Escape focus return
  await page.mouse.move(5, 200)
  await page.keyboard.press('Escape')
  await toggle.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  assert.equal(await platter.evaluate(el => el === document.activeElement), true, 'Tab reaches vinyl platter')
  await page.keyboard.press('Tab')
  assert.equal(await deckPlay.evaluate(el => el === document.activeElement), true, 'Tab reaches Start/Stop deck button')
  await page.keyboard.press('Tab')
  assert.equal(await knob.evaluate(el => el === document.activeElement), true, 'Tab reaches 3D volume knob')
  await page.keyboard.press('Escape')
  assert.equal(await toggle.evaluate(el => el === document.activeElement), true, 'Escape restores toggle focus')
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')

  // Responsive viewport checks
  const sleeve = page.getByRole('button', { name: 'Open turntable' })
  const mobileDialog = page.getByRole('dialog', { name: 'Turntable' })
  for (const [width, height] of [[320, 640], [390, 844], [767, 390], [768, 1024], [1440, 960], [720, 450], [844, 390]]) {
    await page.setViewportSize({ width, height })
    if (width <= 767) {
      await sleeve.click()
      await mobileDialog.waitFor()
      await page.waitForFunction(() => !document.querySelector('#music-player-panel').inert)
    } else {
      await toggle.hover()
    }
    await page.waitForTimeout(420)
    const bounds = await panel.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height, `player fits ${width}x${height}`)
    if (width <= 767) {
      assert.ok(Math.abs(bounds.x + bounds.width / 2 - width / 2) < 1, 'the mobile stage is centered')
      const face = await page.locator('.plinth-face--front').boundingBox()
      const track = await caption.boundingBox()
      assert.ok(face.y + face.height < track.y, `the front of the deck clears the caption at ${width}x${height}`)
    }
    await page.screenshot({ path: resolve(out, `player-${width}x${height}.png`) })
    if (width <= 767) {
      await page.keyboard.press('Escape')
      await mobileDialog.waitFor({ state: 'hidden' })
      assert.equal(await sleeve.evaluate(el => el === document.activeElement), true, 'Escape returns focus to the sleeve')
    } else {
      await page.mouse.move(0, 200)
      await page.waitForTimeout(380)
    }
  }

  // Dark theme & reduced motion
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.evaluate(() => document.documentElement.classList.add('theme-dark'))
  await toggle.hover()
  await page.waitForTimeout(450)
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true')
  const darkStage = await stage.boundingBox()
  await page.mouse.move(darkStage.x + darkStage.width * 0.5, darkStage.y + darkStage.height * 0.55)
  await page.waitForTimeout(450)
  await page.screenshot({ path: resolve(out, 'desktop-dark-playing.png') })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationName), 'none', 'reduced motion stops disc spin')
  await toggle.click()
  assert.deepEqual(errors, [], 'no runtime errors')
  assert.deepEqual(externalMusicRequests, [], 'no external Spotify requests')

  // Touch device verification
  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await touch.goto(url, { waitUntil: 'load' })
  await touch.locator('.site-intro').waitFor({ state: 'detached' })
  const touchSleeve = touch.getByRole('button', { name: 'Open turntable' })
  const touchDialog = touch.getByRole('dialog', { name: 'Turntable' })
  const flyingRecord = touch.locator('.music-player__flight-record')
  const touchAudio = touch.locator('[data-music-audio]')
  const client = await touch.context().newCDPSession(touch)
  async function dragTouch(points) {
    const [start, ...moves] = points.map(([x, y]) => ({ x, y }))
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (const point of moves) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await touch.waitForFunction(() => window.lenis && !window.lenis.isStopped)
  const sleeveBounds = await touchSleeve.boundingBox()
  assert.equal(sleeveBounds.width, 52)
  assert.equal(sleeveBounds.height, 72)
  assert.equal(sleeveBounds.x + sleeveBounds.width, 390)
  await touch.screenshot({ path: resolve(out, 'mobile-light-sleeve.png') })
  const scrollBefore = await touch.evaluate(() => scrollY)
  await touchSleeve.tap()
  await touchDialog.waitFor()
  const scrim = touch.locator('ui-dialog-backdrop')
  assert.match(await scrim.evaluate(el => getComputedStyle(el, '::before').animationName), /turntable-discovery/)
  assert.equal(await touchAudio.getAttribute('src'), null, 'the sleeve opens without requesting playback')
  assert.equal(await touch.evaluate(() => window.lenis.isStopped), true, 'the mobile dialog pauses Lenis')
  await dragTouch([[20, 200], [20, 180], [20, 140], [20, 90]])
  assert.equal(await touch.evaluate(() => scrollY), scrollBefore, 'swiping the scrim does not move the page')
  await touchDialog.getByRole('button', { name: 'Start turntable' }).tap()
  await touch.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > .2)
  await touch.waitForTimeout(450)
  const touchFader = touch.getByRole('slider', { name: 'Music volume' })
  const tfBounds = await touchFader.boundingBox()
  await touch.touchscreen.tap(tfBounds.x + tfBounds.width / 2, tfBounds.y + tfBounds.height * 0.15)
  await touch.waitForFunction(() =>
    Number(document.querySelector('[data-music-fader]').getAttribute('aria-valuenow')) > 75
  )
  const vinyl = await touchDialog.getByRole('slider', { name: 'Record position' }).boundingBox()
  const vinylX = vinyl.x + vinyl.width / 2
  const vinylY = vinyl.y + vinyl.height / 2
  const vinylRadius = Math.min(vinyl.height, vinyl.width) * .32
  await dragTouch([
    [vinylX + vinylRadius, vinylY],
    [vinylX + vinylRadius * .7, vinylY + vinylRadius * .7],
    [vinylX, vinylY + vinylRadius],
  ])
  await touch.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > 5)
  await touch.waitForFunction(() => !document.querySelector('[data-music-audio]').paused)
  const touchStage = await touch.locator('[data-music-stage]').boundingBox()
  const edgeX = touchStage.x + 2
  const edgeY = touchStage.y + touchStage.height * .7
  const closeFlashed = touch.evaluate(() => new Promise(resolve => {
    const player = document.querySelector('[data-music-player]')
    const layer = player.querySelector('.music-player__dialog')
    const panel = player.querySelector('#music-player-panel')
    let sawReturn = false
    function sample() {
      const returning = player.classList.contains('is-returning-record')
      sawReturn ||= returning
      if (sawReturn && !returning) {
        if (!layer.matches(':popover-open')) return resolve(false)
        const opacity = Number(getComputedStyle(layer).opacity) * Number(getComputedStyle(panel).opacity)
        if (opacity > 0.15) return resolve(true)
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }))
  await touch.touchscreen.tap(edgeX, edgeY)
  await touch.locator('.is-returning-record').waitFor()
  assert.equal(await touch.evaluate(() => window.lenis.isStopped), true, 'the page stays still while the record returns')
  await flyingRecord.waitFor()
  await touch.waitForFunction(() => {
    const record = document.querySelector('.music-player__flight-record')?.getBoundingClientRect()
    const deck = document.querySelector('[data-music-stage]').getBoundingClientRect()
    return record && record.right > innerWidth - 56 && deck.right < innerWidth / 2
  })
  await touch.screenshot({ path: resolve(out, 'mobile-record-return.png') })
  await touchDialog.waitFor({ state: 'hidden' })
  assert.equal(await closeFlashed, false, 'the deck never flashes back while the dialog exits')
  assert.equal(await touch.evaluate(() => window.lenis.isStopped), false, 'a tap beside the deck restores Lenis')
  assert.equal(await touchAudio.evaluate(el => el.paused), false, 'closing keeps the track playing')
  await touch.evaluate(() => document.documentElement.classList.add('theme-dark'))
  await touch.waitForTimeout(260)
  await touch.screenshot({ path: resolve(out, 'mobile-dark-playing-sleeve.png') })
  const x = sleeveBounds.x + sleeveBounds.width / 2
  const y = sleeveBounds.y + sleeveBounds.height / 2
  await dragTouch([0, 8, 16].map(distance => [x - distance, y]))
  assert.equal(await touchDialog.isVisible(), false, 'an incomplete pull returns to the jacket')
  await dragTouch([0, 8, 16, 32, 45].map(distance => [x - distance, y]))
  await touchDialog.waitFor()
  await flyingRecord.waitFor()
  const origin = await flyingRecord.evaluate(el => parseFloat(el.style.left) + el.parentElement.getBoundingClientRect().left)
  assert.ok(origin < x - 40, 'the flight starts from the pulled record instead of its tucked position')
  assert.equal(await touch.locator('#music-player-panel').evaluate(el => el.inert), true, 'the deck cannot be operated mid-flight')
  await touch.waitForFunction(() => {
    const deck = document.querySelector('[data-music-stage]')
    const transform = getComputedStyle(deck).transform
    const bounds = deck.getBoundingClientRect()
    return transform !== 'none' && new DOMMatrixReadOnly(transform).m41 < -35 && bounds.right > 25
  })
  await touch.screenshot({ path: resolve(out, 'mobile-record-catch-flight.png') })
  await flyingRecord.waitFor({ state: 'detached' })
  assert.equal(await touchAudio.evaluate(el => el.paused), false, 'pulling the sleeve open keeps the track playing')
  await touch.waitForTimeout(450)
  await touch.screenshot({ path: resolve(out, 'mobile-dark-stage.png') })
  const arm = await touch.locator('[data-music-tonearm-handle]').boundingBox()
  const armX = arm.x + arm.width / 2
  const armY = arm.y + arm.height / 2
  await dragTouch([[armX, armY], [armX - 12, armY], [armX - 24, armY - 2], [armX - 30, armY - 3]])
  await touch.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > 30)
  const deck = await touch.locator('[data-music-plinth]').boundingBox()
  const deckX = deck.x + deck.width * .08
  const deckY = deck.y + deck.height * .12
  const deckAngle = await touch.evaluate(() => parseFloat(document.querySelector('[data-music-player]').style.getPropertyValue('--deck-ry')))
  await dragTouch([[deckX, deckY], [deckX + 30, deckY - 6], [deckX + 70, deckY - 10], [deckX + 120, deckY - 20]])
  await touch.waitForFunction(angle => Math.abs(parseFloat(document.querySelector('[data-music-player]').style.getPropertyValue('--deck-ry')) - angle) > 50, deckAngle)
  await touch.touchscreen.tap(10, 100)
  await touchDialog.waitFor({ state: 'hidden' })
  assert.equal(await touchSleeve.evaluate(el => el === document.activeElement), true, 'scrim dismissal restores sleeve focus')
  assert.equal(await touch.evaluate(() => window.lenis.isStopped), false, 'scrim dismissal restores Lenis')
  await touch.emulateMedia({ reducedMotion: 'reduce' })
  await touchSleeve.press('Enter')
  await touchDialog.waitFor()
  assert.equal(await scrim.evaluate(el => getComputedStyle(el, '::before').animationName), 'none', 'reduced motion keeps the glow still')
  assert.equal(await flyingRecord.count(), 0, 'reduced motion opens the live deck without a flight')
  await touch.keyboard.press('Escape')
  await touchDialog.waitFor({ state: 'hidden' })
  assert.equal(await flyingRecord.count(), 0, 'reduced motion returns to the sleeve without a flight')
  await touch.emulateMedia({ reducedMotion: 'no-preference' })
  await dragTouch([0, 8, 16, 32, 45].map(distance => [x - distance, y]))
  await flyingRecord.waitFor()
  await touch.keyboard.press('Escape')
  await touch.waitForFunction(() => document.querySelector('.music-player__flight-record')
    ?.getAnimations().some(animation => animation.effect.getTiming().duration === 160))
  await touchDialog.waitFor({ state: 'hidden' })
  assert.equal(await flyingRecord.count(), 0, 'closing during the catch removes the flying record')
  assert.equal(await touchSleeve.evaluate(el => el === document.activeElement), true, 'interrupting the catch restores sleeve focus')
  await touch.close()

  // Error & retry recovery
  const blocked = await browser.newPage()
  const audioPath = new URL(await page.locator('[data-music-audio]').getAttribute('data-audio-url'), url).pathname
  await blocked.route(`**${audioPath}`, route => route.abort())
  await blocked.goto(url, { waitUntil: 'load' })
  await blocked.locator('.site-intro').waitFor({ state: 'detached' })
  await blocked.locator('[data-music-toggle]').click()
  await blocked.locator('[data-music-player].has-error').waitFor({ state: 'attached' })
  assert.equal(await blocked.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'false', 'connection failure never pretends to play')
  assert.match(await blocked.locator('[data-music-status]').textContent(), /Can’t load song/)
  await blocked.unroute(`**${audioPath}`)
  await blocked.locator('[data-music-toggle]').click()
  await blocked.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > .2)
  assert.equal(await blocked.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'true', 'retry recovers after connection failure')
  await blocked.close()

  console.log(`PASS (${url}): desktop turntable, mobile sleeve tap and swipe, centered dialog, Lenis and focus restoration, playback, fader, scratch, tonearm, orbit, 7 viewports, themes, reduced motion, and retry.`)
  console.log(`Screenshots: ${out}`)
} finally {
  await browser.close()
  server.close()
}
