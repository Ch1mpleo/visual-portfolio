import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/components/builds/ProjectViewerMotion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

// Control timeline completion without real clocks or a browser. Browser QA covers
// geometry; these tests cover cancellation, cleanup, and preference changes.
function setup(reduced = false, compact = false) {
  const timelines = []
  const tweens = []
  const handlers = {}
  const mediaHandlers = {}
  const media = { matches: reduced, addEventListener: (name, fn) => { mediaHandlers[name] = fn } }
  const element = () => ({ style: {}, hidden: false, dataset: {}, getBoundingClientRect: () => ({ left: 60, top: 24, width: 1320, height: 852 }) })
  const sheet = element()
  const parts = Array.from({ length: 4 }, element)
  sheet.querySelectorAll = () => parts
  const shell = element()
  const art = element()
  art.dataset.transitionArt = 'oboxsteam'
  const title = element()
  shell.querySelectorAll = (selector) => selector === '[data-cover-title]' ? [title] : [art]
  const dialog = element()
  dialog.querySelector = (selector) => selector === '.project-viewer__sheet' ? sheet : shell
  const set = (targets, values) => {
    for (const target of Array.isArray(targets) ? targets : [targets]) {
      for (const [key, value] of Object.entries(values)) {
        if (key === 'clearProps') for (const prop of value.split(',')) delete target.style[prop]
        else if (['x', 'y', 'xPercent', 'yPercent', 'scaleX', 'scaleY'].includes(key)) target.style.transform = 'active transform'
        else target.style[key] = value
      }
    }
  }
  const animation = (options) => ({ steps: [], killed: false, kill() { this.killed = true }, complete() { if (!this.killed) options.onComplete?.() }, to(target, values, at) { this.steps.push({ target, values, at }); return this }, fromTo() { return this } })
  const gsap = {
    set,
    timeline(options) { const result = animation(options); timelines.push(result); return result },
    fromTo(target, from, to) { set(target, from); const result = animation(to); tweens.push(result); return result },
  }
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: () => ({ gsap }), matchMedia: (query) => query.includes('reduced-motion') ? media : { matches: compact }, window: { addEventListener: (name, fn) => { handlers[name] = fn } }, innerHeight: 900 })
  const motion = new exports.ProjectViewerMotion(dialog)
  const trigger = { getBoundingClientRect: () => ({ left: 80, top: 200, width: 600, height: 500, bottom: 700 }) }
  return { motion, dialog, sheet, shell, parts, title, trigger, timelines, tweens, handlers, mediaHandlers, media, element }
}

test('reduced motion opens/closes synchronously and skips fades', () => {
  const s = setup(true)
  let opened = 0, closed = 0
  s.motion.open(s.trigger, 'oboxsteam', () => opened++)
  s.motion.fade(s.element())
  s.motion.close(s.trigger, 'oboxsteam', () => closed++)
  assert.equal(opened, 1)
  assert.equal(closed, 1)
  assert.equal(s.timelines.length, 0)
  assert.equal(s.tweens.length, 0)
  assert.equal(s.shell.hidden, true)
})

test('closing during opening cancels its callback and clears the shell', () => {
  const s = setup()
  let opened = 0, closed = 0
  s.motion.open(s.trigger, 'oboxsteam', () => opened++)
  s.motion.close(s.trigger, 'oboxsteam', () => closed++)
  s.timelines[0].complete()
  s.timelines[1].complete()
  assert.equal(opened, 0)
  assert.equal(closed, 1)
  assert.equal(s.shell.hidden, true)
  assert.equal(s.dialog.style.transform, undefined)
  assert.equal(s.sheet.style.opacity, undefined)
  assert.equal(s.dialog.style.clipPath, undefined)
  assert.equal(s.dialog.style['--viewer-backdrop'], undefined)
  for (const part of s.parts) assert.equal(part.style.transform, undefined)
})

test('resize finishes opening once without leaving transforms', () => {
  const s = setup()
  let opened = 0
  s.motion.open(s.trigger, 'oboxsteam', () => opened++)
  s.handlers.resize()
  s.timelines[0].complete()
  assert.equal(opened, 1)
  assert.equal(s.shell.hidden, true)
  assert.equal(s.dialog.style.transformOrigin, undefined)
  assert.equal(s.dialog.style.clipPath, undefined)
  assert.equal(s.title.style.transform, undefined)
})

test('enabling reduced motion during closing completes and cleans up', () => {
  const s = setup()
  let closed = 0
  s.motion.open(s.trigger, 'oboxsteam', () => {})
  s.timelines[0].complete()
  s.motion.close(s.trigger, 'oboxsteam', () => closed++)
  s.media.matches = true
  s.mediaHandlers.change()
  s.timelines[1].complete()
  assert.equal(closed, 1)
  assert.equal(s.shell.hidden, true)
})

test('rapid panel changes cancel the old fade and restore both panels', () => {
  const s = setup()
  const first = s.element(), second = s.element()
  s.motion.fade(first)
  s.motion.fade(second)
  assert.equal(s.tweens[0].killed, true)
  assert.equal(first.style.opacity, undefined)
  assert.equal(first.style.transform, undefined)
  s.tweens[1].complete()
  assert.equal(second.style.opacity, undefined)
  assert.equal(second.style.transform, undefined)
})

test('cover opens leftward and closes rightward without stretching the sheet', () => {
  const s = setup()
  s.motion.open(s.trigger, 'oboxsteam', () => {})
  const opening = s.timelines[0].steps
  assert.equal(opening.find(step => step.target === s.shell).values.xPercent, -101)
  assert.equal(s.dialog.style.clipPath, 'inset(0% 0% 0% 100%)')
  assert.ok(opening.every(step => !('scaleX' in step.values) && !('scaleY' in step.values)))
  s.timelines[0].complete()
  s.motion.close(s.trigger, 'oboxsteam', () => {})
  assert.equal(s.timelines[1].steps.find(step => step.target === s.shell).values.xPercent, 0)
})

test('interrupted opening preserves the cover position before reversing', () => {
  const s = setup()
  s.motion.open(s.trigger, 'oboxsteam', () => {})
  s.shell.style.transform = 'translate(-42%, 0)'
  s.motion.close(s.trigger, 'oboxsteam', () => {})
  assert.equal(s.shell.style.transform, 'translate(-42%, 0)')
  s.timelines[1].complete()
  assert.equal(s.shell.style.transform, undefined)
})

test('phone uses the same cover direction with a shorter sweep', () => {
  const s = setup(false, true)
  s.motion.open(s.trigger, 'oboxsteam', () => {})
  const sweep = s.timelines[0].steps.find(step => step.target === s.shell)
  assert.equal(sweep.values.xPercent, -101)
  assert.equal(sweep.values.duration, 0.5)
})
