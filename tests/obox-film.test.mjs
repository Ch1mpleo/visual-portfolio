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
    exports, require: () => ({ oboxEngineering: [] }), matchMedia: () => media,
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

test('Obox beat selection highlights one beat, drives its stage, and stays scoped to its chapter', () => {
  const s = setup()
  const classes = () => { const set = new Set(); return { set, toggle(name, on) { on ? set.add(name) : set.delete(name) } } }
  const chapter = ids => {
    const notes = [...ids, 'screen'].map(id => ({ dataset: { oboxPartPanel: id }, classList: classes() }))
    const objects = ids.map(id => ({ dataset: { storyObject: id }, classList: classes(), attributes: {}, setAttribute(name, value) { this.attributes[name] = value } }))
    const art = { inert: false, toggleAttribute(_name, on) { this.inert = on } }
    const enlarge = { tabIndex: -1 }
    const stage = { dataset: {}, focus: null, style: { setProperty(_name, value) { stage.focus = value } }, querySelector: selector => selector === '.obox-engine__art' ? art : enlarge }
    const selected = () => notes.filter(note => note.classList.set.has('is-selected')).map(note => note.dataset.oboxPartPanel)
    return { notes, objects, stage, art, enlarge, selected, dataset: {}, querySelector: () => stage, querySelectorAll: selector => selector === '[data-obox-part-panel]' ? notes : objects }
  }
  const create = chapter(['blueprint', 'review', 'release'])
  const learn = chapter(['class', 'activity', 'evidence'])
  s.controller.selectPart(create, 'review')
  s.controller.selectPart(learn, 'activity')
  assert.deepEqual(create.selected(), ['review'])
  assert.deepEqual(learn.selected(), ['activity'])
  assert.equal(create.objects[1].attributes['aria-pressed'], 'true')
  assert.equal(create.stage.focus, '1')
  assert.equal(create.stage.dataset.view, 'art')
  s.controller.selectPart(create, 'screen')
  assert.deepEqual(create.selected(), ['screen'])
  assert.equal(create.stage.dataset.view, 'screen')
  assert.equal(create.art.inert, true)
  assert.equal(create.enlarge.tabIndex, 0)
  assert.deepEqual(learn.selected(), ['activity'])
})
