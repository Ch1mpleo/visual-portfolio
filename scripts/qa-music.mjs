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
  const toggle = page.locator('[data-music-toggle]')
  const panel = page.locator('#music-player-panel')
  const status = page.locator('[data-music-status]')
  const disc = page.locator('.music-player__disc')
  const ascii = page.locator('[data-music-ascii]')
  const volume = page.getByRole('slider', { name: 'Music volume' })
  const seek = page.locator('[data-music-seek]')
  const platter = page.getByRole('slider', { name: 'Record position' })
  const cue = page.locator('[data-music-cue]')
  const tonearm = page.locator('.music-player__tonearm')
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'audio starts off')
  assert.equal(await panel.evaluate(el => el.inert), true, 'collapsed controls are not focusable')
  assert.equal(await page.locator('[data-music-audio]').getAttribute('src'), null, 'audio loads on demand')
  assert.equal(await seek.isDisabled(), true, 'seeking is disabled before audio metadata loads')
  assert.equal(await page.locator('[data-music-duration]').textContent(), '--:--', 'no invented duration before metadata')

  await toggle.hover()
  assert.equal(await panel.locator('iframe, a').count(), 0, 'player has no external players or links')
  const parkedArm = await tonearm.evaluate(el => getComputedStyle(el).transform)
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'hover never starts audio')
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime >= 1 && document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true', null, { timeout: 20000 })
  assert.equal(await status.textContent(), 'Now playing', 'full-song playback is reported')
  assert.equal(await seek.isEnabled(), true, 'seeking becomes available when audio loads')
  const realDuration = await page.locator('[data-music-audio]').evaluate(el => el.duration)
  assert.ok(realDuration > 240, 'the loaded audio is the full song, not the preview')
  console.log(`Full audio duration: ${realDuration.toFixed(2)} seconds`)
  assert.ok(Math.abs(Number(await seek.getAttribute('max')) - realDuration) < .01, 'seek range matches actual audio duration')
  assert.equal(await page.locator('[data-music-duration]').textContent(), `${Math.floor(realDuration / 60)}:${String(Math.floor(realDuration % 60)).padStart(2, '0')}`)
  await page.waitForFunction(() => document.querySelector('[data-music-elapsed]').textContent !== '0:00')
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationPlayState), 'running')
  assert.notEqual(await tonearm.evaluate(el => getComputedStyle(el).transform), parkedArm, 'play lowers the tonearm onto the record')
  await page.waitForFunction(() => Number(document.querySelector('[data-music-player]').style.getPropertyValue('--music-energy')) > .01)
  const asciiBefore = await ascii.evaluate(el => el.toDataURL())
  const firstRotation = await disc.evaluate(el => getComputedStyle(el).transform)
  await page.waitForTimeout(700)
  await page.screenshot({ path: resolve(out, 'desktop-playing.png') })
  assert.notEqual(await disc.evaluate(el => getComputedStyle(el).transform), firstRotation, 'disc rotates during playback')
  assert.notEqual(await ascii.evaluate(el => el.toDataURL()), asciiBefore, 'ASCII pattern changes with real audio')

  const outputLevel = () => page.evaluate(() => {
    const data = new Uint8Array(window.musicTest.meter.fftSize)
    window.musicTest.meter.getByteTimeDomainData(data)
    return data.reduce((sum, sample) => sum + Math.abs(sample - 128), 0) / data.length
  })
  assert.ok(await outputLevel() > 0, 'audio reaches the output gain')
  await volume.focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  assert.equal(await volume.inputValue(), '0')
  assert.ok(await page.evaluate(() => window.musicTest.gain.gain.value) < .001, 'zero volume mutes the connected gain')
  assert.equal(await outputLevel(), 0, 'zero volume produces silent output')
  assert.equal(await volume.getAttribute('aria-valuetext'), '0 percent')
  await page.keyboard.press('End')
  await page.waitForTimeout(300)
  assert.equal(await volume.inputValue(), '100')
  assert.ok(await page.evaluate(() => window.musicTest.gain.gain.value) > .99, 'full volume restores the output gain')
  assert.ok(await outputLevel() > 0, 'audio returns after unmuting')
  await page.keyboard.press('ArrowDown')
  assert.equal(await volume.inputValue(), '99', 'vertical slider supports arrow keys')
  await volume.evaluate(el => { el.value = '65'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-status]').textContent === 'Sound off')
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
  const pausedAscii = await ascii.evaluate(el => el.toDataURL())
  await page.waitForTimeout(200)
  assert.equal(await ascii.evaluate(el => el.toDataURL()), pausedAscii, 'ASCII motion stops with playback')
  await seek.focus()
  await page.keyboard.press('Home')
  assert.equal(await page.locator('[data-music-elapsed]').textContent(), '0:00', 'keyboard can seek to start')
  const cueAtStart = await cue.evaluate(el => el.style.getPropertyValue('--cue-angle'))
  await seek.evaluate(el => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForFunction(() => Math.abs(document.querySelector('[data-music-audio]').currentTime - 10) < .2)
  assert.equal(await page.locator('[data-music-elapsed]').textContent(), '0:10')
  assert.match(await seek.getAttribute('aria-valuetext'), /^0:10 of /, 'seek announces elapsed and total time')
  assert.equal(await page.locator('[data-music-audio]').evaluate(el => el.paused), true, 'seeking while paused does not start music')
  assert.notEqual(await cue.evaluate(el => el.style.getPropertyValue('--cue-angle')), cueAtStart, 'timeline seeking turns the record to its new position')

  const platterBounds = await platter.boundingBox()
  const centerX = platterBounds.x + platterBounds.width / 2
  const centerY = platterBounds.y + platterBounds.height / 2
  const radius = platterBounds.width * .35
  await page.mouse.move(centerX + radius, centerY)
  await page.mouse.down()
  await page.mouse.move(centerX + radius * .707, centerY + radius * .707)
  await page.mouse.move(centerX, centerY + radius)
  await page.mouse.up()
  assert.ok(await page.locator('[data-music-audio]').evaluate(el => el.currentTime > 12.5), 'dragging the record physically cues the audio forward')
  assert.equal(await page.locator('[data-music-audio]').evaluate(el => el.paused), true, 'record drag preserves paused playback')

  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true')
  await seek.evaluate(el => { el.value = '120'; el.dispatchEvent(new Event('input', { bubbles: true })) })
  await page.waitForFunction(() => {
    const audio = document.querySelector('[data-music-audio]')
    return audio.currentTime >= 120 && !audio.paused && !audio.seeking
  })
  assert.match(await page.locator('[data-music-elapsed]').textContent(), /^2:0/, 'full song plays and seeks beyond preview length')
  await page.evaluate(() => {
    const video = document.createElement('video')
    document.body.append(video)
    video.dispatchEvent(new Event('play'))
    video.remove()
  })
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', 'audible video pauses music')

  await page.mouse.move(5, 200)
  await page.keyboard.press('Escape')
  await toggle.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  assert.equal(await platter.evaluate(el => el === document.activeElement), true, 'keyboard reaches the record')
  await page.keyboard.press('Tab')
  assert.equal(await volume.evaluate(el => el === document.activeElement), true, 'keyboard reaches volume slider')
  await page.keyboard.press('Tab')
  assert.equal(await seek.evaluate(el => el === document.activeElement), true, 'keyboard reaches timeline slider')
  await page.keyboard.press('Escape')
  assert.equal(await toggle.evaluate(el => el === document.activeElement), true, 'Escape restores toggle focus')
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')

  for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1440, 960], [720, 450], [844, 390]]) {
    await page.setViewportSize({ width, height })
    await toggle.hover()
    await page.waitForTimeout(300)
    const bounds = await panel.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height, `player fits ${width}x${height}`)
    assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), true, `no internal overflow at ${width}`)
    await page.screenshot({ path: resolve(out, `player-${width}x${height}.png`) })
    await page.mouse.move(0, 200)
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => document.documentElement.classList.add('theme-dark'))
  await toggle.hover()
  await page.screenshot({ path: resolve(out, 'dark.png') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await disc.evaluate(el => getComputedStyle(el).animationName), 'none', 'reduced motion stops rotation')
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-music-toggle]').getAttribute('aria-pressed') === 'true')
  const reducedAscii = await ascii.evaluate(el => el.toDataURL())
  await page.waitForTimeout(200)
  assert.equal(await ascii.evaluate(el => el.toDataURL()), reducedAscii, 'reduced motion holds ASCII background still during audio')
  await toggle.click()
  assert.deepEqual(errors, [], 'no runtime errors')
  assert.deepEqual(externalMusicRequests, [], 'player makes no Spotify requests')

  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await touch.goto(url, { waitUntil: 'load' })
  await touch.locator('.site-intro').waitFor({ state: 'detached' })
  await touch.locator('[data-music-toggle]').tap()
  assert.equal(await touch.locator('[data-music-toggle]').getAttribute('aria-expanded'), 'true', 'tap expands player')
  await touch.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > .2)
  const touchVolume = touch.getByRole('slider', { name: 'Music volume' })
  const sliderBounds = await touchVolume.boundingBox()
  await touchVolume.tap({ position: { x: sliderBounds.width / 2, y: 10 } })
  assert.ok(Number(await touchVolume.inputValue()) > 70, 'touch adjusts vertical volume slider')
  const touchSeek = touch.getByRole('slider', { name: 'Song progress' })
  const seekBounds = await touchSeek.boundingBox()
  await touchSeek.tap({ position: { x: seekBounds.width / 2, y: seekBounds.height / 2 } })
  assert.ok(await touch.locator('[data-music-audio]').evaluate(el => el.currentTime > el.duration * .3), 'touch seeks through audio')
  await touch.locator('[data-music-toggle]').tap()
  await touch.locator('body').tap({ position: { x: 10, y: 250 } })
  assert.equal(await touch.locator('[data-music-toggle]').getAttribute('aria-expanded'), 'false', 'outside tap collapses player')
  await touch.close()

  const blocked = await browser.newPage()
  const audioPath = new URL(await page.locator('[data-music-audio]').getAttribute('data-audio-url'), url).pathname
  await blocked.route(`**${audioPath}`, route => route.abort())
  await blocked.goto(url, { waitUntil: 'load' })
  await blocked.locator('.site-intro').waitFor({ state: 'detached' })
  await blocked.locator('[data-music-toggle]').click()
  await blocked.locator('[data-music-player].has-error').waitFor({ state: 'attached' })
  assert.equal(await blocked.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'false', 'connection failure never pretends to play')
  assert.match(await blocked.locator('[data-music-status]').textContent(), /Can’t load song/)
  assert.equal(await blocked.locator('[data-music-player] a').count(), 0, 'failures do not send listeners to Spotify')
  await blocked.unroute(`**${audioPath}`)
  await blocked.locator('[data-music-toggle]').click()
  await blocked.waitForFunction(() => document.querySelector('[data-music-audio]').currentTime > .2)
  assert.equal(await blocked.locator('[data-music-toggle]').getAttribute('aria-pressed'), 'true', 'retry recovers after connection failure')
  await blocked.close()
  console.log(`PASS (${url}): real audio, timestamps/seeking, record drag and cue rotation, tonearm, volume/mute, reactive ASCII, keyboard, six viewport sizes, themes, reduced motion, touch, retry, and no Spotify requests.`)
  console.log(`Screenshots: ${out}`)
} finally {
  await browser.close()
  server.close()
}
