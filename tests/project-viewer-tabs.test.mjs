import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function dataModule(path) {
  const module = { exports: {} }
  vm.runInNewContext(compile(path), { module, exports: module.exports })
  return module.exports
}
const projectData = dataModule('../src/data/projects.ts')
const interiorData = dataModule('../src/data/projectInteriors.ts')
const source = compile('../src/components/builds/ProjectViewerController.ts')

function setup(projectId = 'museums') {
  const document = { activeElement: null, addEventListener() {}, dispatchEvent() {}, querySelector: () => null, documentElement: { classList: { add() {}, remove() {} } } }
  const element = (dataset = {}) => ({
    dataset, hidden: false, scrollTop: 0, scrollLeft: 0, tabIndex: -1, attributes: {}, handlers: {},
    classList: { toggle() {} },
    addEventListener(name, handler) { this.handlers[name] = handler },
    setAttribute(name, value) { this.attributes[name] = value },
    removeAttribute(name) { delete this.attributes[name] },
    focus() { document.activeElement = this },
  })
  const tabs = ['experience', 'under-the-hood', 'stack'].map(projectTab => element({ projectTab }))
  const panels = Object.entries(projectData.projectViews).flatMap(([viewerProject, views]) => views.map(viewerTab => element({ viewerProject, viewerTab })))
  const nodes = new Map(['scroller', 'close', 'previous', 'next', 'logo', 'title', 'category', 'counter', 'announcement'].map(name => [`[data-viewer-${name}]`, element()]))
  const scene = element()
  const dialog = {
    open: false, addEventListener() {}, showModal() { this.open = true },
    querySelector(selector) { return selector === '[data-graph-scene]' ? scene : nodes.get(selector) },
    querySelectorAll(selector) { return selector === '[data-project-tab]' ? tabs : selector === '[data-viewer-project]' ? panels : [] },
  }
  class Motion { open(_trigger, _project, done) { done() } finish() {} fade() {} }
  class Obox { reset() {} play() {} pause() {} }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module, exports: module.exports, document, Event,
    window: { scrollX: 0, scrollY: 1200, scrollTo() {} },
    matchMedia: () => ({ matches: true }),
    require(name) {
      if (name.endsWith('/projects')) return projectData
      if (name.endsWith('/projectInteriors')) return interiorData
      if (name === './ProjectViewerMotion') return { ProjectViewerMotion: Motion }
      if (name === './OboxDetailController') return { OboxDetailController: Obox }
      if (name === './viewerEvents') return { OPEN_PROJECT: 'open-project' }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  const viewer = new module.exports.ProjectViewerController(dialog)
  viewer.open(projectId, element())
  const key = (index, value) => tabs[index].handlers.keydown({ key: value, preventDefault() {} })
  const visiblePanel = () => panels.filter(panel => !panel.hidden).map(panel => `${panel.dataset.viewerProject}/${panel.dataset.viewerTab}`)
  return { viewer, tabs, document, key, visiblePanel }
}

test('museum tab keyboard navigation skips the unavailable view in both directions', () => {
  const s = setup()
  assert.equal(s.tabs[1].hidden, true)
  assert.equal(s.tabs[1].attributes['aria-controls'], undefined)
  s.key(0, 'ArrowRight')
  assert.deepEqual(s.visiblePanel(), ['museums/stack'])
  assert.equal(s.document.activeElement, s.tabs[2])
  s.key(2, 'ArrowRight')
  assert.deepEqual(s.visiblePanel(), ['museums/experience'])
  s.key(0, 'ArrowLeft')
  assert.equal(s.document.activeElement, s.tabs[2])
  s.key(2, 'Home')
  assert.equal(s.document.activeElement, s.tabs[0])
  s.key(0, 'End')
  assert.equal(s.document.activeElement, s.tabs[2])
})

test('an unavailable museum view cannot expose an empty panel', () => {
  const s = setup()
  s.viewer.switchTab('under-the-hood')
  assert.deepEqual(s.visiblePanel(), ['museums/experience'])
  assert.equal(s.tabs[0].attributes['aria-selected'], 'true')
})

test('switching projects restores their tabs and resets the active view', () => {
  const s = setup()
  s.viewer.switchProject(-1)
  assert.equal(s.tabs[1].hidden, false)
  assert.equal(s.tabs[1].attributes['aria-controls'], 'viewer-graphpaper-under-the-hood')
  s.key(0, 'ArrowRight')
  assert.deepEqual(s.visiblePanel(), ['graphpaper/under-the-hood'])
  s.viewer.switchProject(1)
  assert.deepEqual(s.visiblePanel(), ['museums/experience'])
  assert.equal(s.tabs[1].hidden, true)
  s.viewer.switchProject(1)
  assert.equal(s.tabs[1].hidden, false)
  assert.deepEqual(s.visiblePanel(), ['oboxsteam/experience'])
})
