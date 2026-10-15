import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
const source = ts.transpileModule(readFileSync(new URL('../src/components/builds/OboxDetailController.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup() {
  let observe, preferenceChange
  const media = { matches: false, addEventListener(_name, fn) { preferenceChange = fn } }
  const film = { paused: true, rect: { top: 150, bottom: 550, height: 400 }, play() { this.paused = false; return Promise.resolve() }, pause() { this.paused = true }, getBoundingClientRect() { return this.rect } }
  const zoom = { open: false, addEventListener() {}, querySelector: () => ({ addEventListener() {} }) }
  const scroller = { addEventListener() {}, getBoundingClientRect: () => ({ top: 100, bottom: 700 }) }
  const viewer = { open: true, querySelectorAll: () => [], querySelector: selector => selector === '[data-obox-film]' ? film : selector === '[data-obox-zoom]' ? zoom : scroller }
  const exports = {}
  vm.runInNewContext(source, {
    exports, require: () => ({}), matchMedia: () => media,
    IntersectionObserver: class { constructor(fn) { observe = fn } observe() {} },
  })
  const controller = new exports.OboxDetailController(viewer)
  return { controller, film, viewer, zoom, media, leaveView: () => observe([{ isIntersecting: false }]), reduceMotion: () => { media.matches = true; preferenceChange() } }
}

test('film autoplays only when visible in the open story', () => {
  const s = setup()
  s.controller.play()
  assert.equal(s.film.paused, false)
  s.controller.pause()
  for (const rect of [{ top: 750, bottom: 1150, height: 400 }, { top: -400, bottom: 0, height: 400 }, { top: 0, bottom: 0, height: 0 }]) {
    s.film.rect = rect
    s.controller.play()
    assert.equal(s.film.paused, true)
  }
})

test('closed sheets, screenshot zoom, and reduced motion suppress autoplay', () => {
  const s = setup()
  s.viewer.open = false
  s.controller.play()
  assert.equal(s.film.paused, true)
  s.viewer.open = true
  s.zoom.open = true
  s.controller.play()
  assert.equal(s.film.paused, true)
  s.zoom.open = false
  s.media.matches = true
  s.controller.play()
  assert.equal(s.film.paused, true)
})

test('leaving view or enabling reduced motion pauses an already playing film', () => {
  const s = setup()
  s.controller.play()
  s.leaveView()
  assert.equal(s.film.paused, true)
  s.controller.play()
  s.reduceMotion()
  assert.equal(s.film.paused, true)
})