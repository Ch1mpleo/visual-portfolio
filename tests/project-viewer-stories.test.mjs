import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function dataModule(path) {
  const exports = {}
  vm.runInNewContext(compile(path), { exports })
  return exports
}
const projectData = dataModule('../src/data/projects.ts')

function setup(projectId = 'oboxsteam') {
  const frames = []
  const locks = new Set()
  const pageScrolls = []
  const stories = []
  const lenis = { isStopped: false, stop() { this.isStopped = true }, start() { this.isStopped = false }, scrollTo() {} }
  const document = { activeElement: null, addEventListener() {}, dispatchEvent() {}, querySelector: () => null, documentElement: { classList: { add: name => locks.add(name), remove: name => locks.delete(name) } } }
  const element = (dataset = {}) => ({
    dataset, hidden: false, scrollTop: 0, scrollLeft: 0, attributes: {}, handlers: {}, textContent: '',
    classList: { toggle() {} },
    addEventListener(name, handler) { this.handlers[name] = handler },
    setAttribute(name, value) { this.attributes[name] = value },
    focus() { document.activeElement = this },
    getClientRects() { return this.hidden ? [] : [{}] },
  })
  const panels = Array.from(projectData.projects, project => element({ viewerProject: project.id }))
  const chapters = [element(), element()]
  const nodes = new Map(['scroller', 'close', 'previous', 'next', 'previous-label', 'next-label', 'logo', 'title', 'category', 'counter', 'announcement'].map(name => [`[data-viewer-${name}]`, element()]))
  const dialog = {
    open: false, handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler },
    showModal() { this.open = true },
    close() { this.open = false; this.handlers.close() },
    querySelector(selector) { return nodes.get(selector) },
    querySelectorAll(selector) {
      if (selector === '[data-viewer-project]') return panels
      if (selector === '[data-scroll-story]') return chapters
      if (selector.startsWith('button:')) return [nodes.get('[data-viewer-close]'), nodes.get('[data-viewer-next]')]
      return []
    },
  }
  class Motion { open(_trigger, _project, done) { done() } close(_trigger, _project, done) { done() } clear() {} finish() {} fade() {} }
  class Obox { reset() {} play() {} pause() {} dismissZoom() {} }
  class Story { constructor(scroller, items) { this.scroller = scroller; this.items = items; this.resets = 0; stories.push(this) } reset() { this.resets++ } }
  const exports = {}
  vm.runInNewContext(compile('../src/components/builds/ProjectViewerController.ts'), {
    exports, document, Event, requestAnimationFrame: fn => frames.push(fn),
    window: { scrollX: 0, scrollY: 1200, scrollTo: (x, y) => pageScrolls.push([x, y]), lenis },
    matchMedia: () => ({ matches: true }),
    require(name) {
      if (name.endsWith('/projects')) return projectData
      if (name === './ProjectViewerMotion') return { ProjectViewerMotion: Motion }
      if (name === './OboxDetailController') return { OboxDetailController: Obox }
      if (name === './ScrollStory') return { ScrollStory: Story }
      if (name === './viewerEvents') return { OPEN_PROJECT: 'open-project' }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  const viewer = new exports.ProjectViewerController(dialog)
  const trigger = element()
  viewer.open(projectId, trigger)
  const flushFrames = () => { while (frames.length) frames.shift()() }
  flushFrames()
  return { viewer, panels, chapters, story: stories[0], nodes, dialog, document, trigger, locks, lenis, pageScrolls, flushFrames }
}

test('project switches expose one complete story and reset its shared scroll position', () => {
  const s = setup()
  const scroller = s.nodes.get('[data-viewer-scroller]')
  scroller.scrollTop = 2027
  s.viewer.switchProject(1)
  assert.equal(scroller.scrollTop, 0)
  s.flushFrames()
  assert.equal(scroller.scrollTop, 0)
  assert.deepEqual(s.panels.filter(panel => !panel.hidden).map(panel => panel.dataset.viewerProject), ['graphpaper'])
  scroller.scrollTop = 1054
  s.viewer.switchProject(1)
  s.viewer.switchProject(-1)
  s.flushFrames()
  assert.equal(scroller.scrollTop, 0)
  assert.deepEqual(s.panels.filter(panel => !panel.hidden).map(panel => panel.dataset.viewerProject), ['graphpaper'])
})

test('every story chapter shares one scroll story that resets on open and project changes', () => {
  const s = setup('graphpaper')
  assert.equal(s.story.scroller, s.nodes.get('[data-viewer-scroller]'))
  assert.equal(s.story.items.length, s.chapters.length)
  s.chapters.forEach((chapter, index) => assert.equal(s.story.items[index], chapter))
  const opened = s.story.resets
  assert.ok(opened >= 1)
  s.viewer.switchProject(1)
  assert.equal(s.story.resets, opened + 1)
})

test('footer controls name the neighbouring projects', () => {
  const s = setup('graphpaper')
  assert.equal(s.nodes.get('[data-viewer-previous-label]').textContent, 'OboxSTEAM')
  assert.equal(s.nodes.get('[data-viewer-next-label]').textContent, 'Interactive Museums')
  assert.equal(s.nodes.get('[data-viewer-next]').attributes['aria-label'], 'Next project: Interactive Museums')
})

test('Escape restores background scroll, scrolling availability, and the original gallery trigger', () => {
  const s = setup()
  assert.equal(s.lenis.isStopped, true)
  assert.equal(s.locks.has('is-project-viewer-open'), true)
  s.dialog.handlers.cancel({ preventDefault() {} })
  assert.equal(s.dialog.open, false)
  assert.equal(s.document.activeElement, s.trigger)
  assert.deepEqual(s.pageScrolls.at(-1), [0, 1200])
  assert.equal(s.lenis.isStopped, false)
  assert.equal(s.locks.size, 0)
})

test('Tab and Shift+Tab wrap between the persistent viewer controls', () => {
  const s = setup()
  const first = s.nodes.get('[data-viewer-close]'), last = s.nodes.get('[data-viewer-next]')
  first.focus()
  s.dialog.handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} })
  assert.equal(s.document.activeElement, last)
  s.dialog.handlers.keydown({ key: 'Tab', shiftKey: false, preventDefault() {} })
  assert.equal(s.document.activeElement, first)
})
