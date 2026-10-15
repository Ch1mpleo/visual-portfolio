import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
const source = ts.transpileModule(readFileSync(new URL('../src/components/builds/ScrollStory.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const classes = () => { const set = new Set(); return { set, toggle(name, on) { on ? set.add(name) : set.delete(name) } } }

function chapter(ids, extra = []) {
  const beats = [...ids.map(id => ({ id })), ...extra].map(({ id, view }) => ({ dataset: view ? { storyBeat: id, storyView: view } : { storyBeat: id }, classList: classes(), top: 1000, getBoundingClientRect() { return { top: this.top } } }))
  const objects = ids.map(id => ({ dataset: { storyObject: id }, classList: classes(), attributes: {}, handlers: {}, setAttribute(name, value) { this.attributes[name] = value }, addEventListener(name, fn) { this.handlers[name] = fn }, focus() {} }))
  const layers = ['art', 'screen'].map(name => ({ dataset: { storyLayer: name }, inert: false, toggleAttribute(_name, on) { this.inert = on } }))
  const stage = { dataset: {}, focus: null, style: { setProperty(_name, value) { stage.focus = value } }, querySelectorAll: () => layers }
  return {
    beats, objects, layers, stage, dataset: {}, visible: true,
    getClientRects() { return this.visible ? [{}] : [] },
    selected: () => beats.filter(beat => beat.classList.set.has('is-selected')).map(beat => beat.dataset.storyBeat),
    querySelector: selector => selector === '[data-story-stage]' ? stage : selector === '[data-story-beat]' ? beats[0] : beats.find(beat => selector.includes(`"${beat.dataset.storyBeat}"`)),
    querySelectorAll: selector => selector === '[data-story-beat]' ? beats : objects,
  }
}

function setup(chapters) {
  const frames = []
  const scroller = { scrollTop: 0, handlers: {}, scrolls: [], addEventListener(name, fn) { this.handlers[name] = fn }, getBoundingClientRect: () => ({ top: 0, height: 600 }), scrollTo(options) { this.scrolls.push(options) } }
  const exports = {}
  vm.runInNewContext(source, { exports, Date, matchMedia: () => ({ matches: false }), requestAnimationFrame: fn => frames.push(fn) })
  const story = new exports.ScrollStory(scroller, chapters)
  const scroll = () => { scroller.handlers.scroll(); while (frames.length) frames.shift()() }
  return { story, scroller, scroll }
}

test('selection highlights one beat, drives its stage, and stays scoped to its chapter', () => {
  const create = chapter(['blueprint', 'review', 'release'], [{ id: 'screen', view: 'screen' }])
  const learn = chapter(['class', 'activity', 'evidence'])
  const { story } = setup([create, learn])
  story.select(create, 'review')
  story.select(learn, 'activity')
  assert.deepEqual(create.selected(), ['review'])
  assert.deepEqual(learn.selected(), ['activity'])
  assert.equal(create.objects[1].attributes['aria-pressed'], 'true')
  assert.equal(create.stage.focus, '1')
  assert.equal(create.stage.dataset.view, 'art')
  assert.deepEqual(create.layers.map(layer => layer.inert), [false, true])
  story.select(create, 'screen')
  assert.deepEqual(create.selected(), ['screen'])
  assert.equal(create.stage.dataset.view, 'screen')
  assert.deepEqual(create.layers.map(layer => layer.inert), [true, false])
  assert.deepEqual(learn.selected(), ['activity'])
})

test('scrolling selects the last beat above the reading line and skips hidden chapters', () => {
  const visible = chapter(['document', 'chunks', 'entities', 'graph'])
  const hidden = chapter(['a', 'b'])
  hidden.visible = false
  hidden.beats.forEach(beat => { beat.top = 0 })
  const { story, scroll } = setup([visible, hidden])
  story.reset()
  visible.beats[0].top = 100
  visible.beats[1].top = 280
  visible.beats[2].top = 320
  scroll()
  assert.deepEqual(visible.selected(), ['chunks'])
  assert.deepEqual(hidden.selected(), ['a'])
})

test('hotspots scroll their beat to the reading line and reset restores the first beat', () => {
  const graph = chapter(['document', 'chunks', 'entities', 'graph'])
  const { story, scroller } = setup([graph])
  graph.beats[2].top = 900
  graph.objects[2].handlers.click()
  assert.deepEqual(graph.selected(), ['entities'])
  assert.equal(scroller.scrolls.at(-1).top, 900 - 300 + 24)
  graph.objects[2].handlers.keydown({ key: 'ArrowRight', preventDefault() {} })
  assert.deepEqual(graph.selected(), ['graph'])
  story.reset()
  assert.deepEqual(graph.selected(), ['document'])
  assert.equal(graph.stage.focus, '0')
})
