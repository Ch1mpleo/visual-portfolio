import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
function load(path, globals = {}) {
  const url = new URL(path, import.meta.url)
  if (!existsSync(url)) return {}
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, setTimeout, clearTimeout, ...globals })
  return exports
}
function setup(hostname = 'ch1mple.id.vn') {
  const scripts = [], calls = []
  const window = { location: { hostname, protocol: 'https:', href: `https://${hostname}/` }, gtag: (...args) => calls.push(args) }
  const document = { createElement: () => ({}), head: { append: node => scripts.push(node) } }
  return { api: load('../src/utils/analytics.ts', { window, document }), scripts, calls, window }
}

test('production tracking starts once and preserves the current measurement ID', () => {
  const s = setup()
  assert.equal(typeof s.api.startAnalytics, 'function')
  s.api.startAnalytics(true, 'G-RH2J4YXLP3')
  s.api.startAnalytics(true, 'G-RH2J4YXLP3')
  assert.equal(s.scripts.length, 1)
  assert.equal(s.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-RH2J4YXLP3')
  assert.equal(s.calls.filter(call => call[0] === 'config').length, 1)
})

test('development and local/private hosts cannot load providers or send events', () => {
  for (const host of ['localhost', 'localhost.', '127.0.0.1', '127.0.0.1.', '[::1]', '192.168.1.10', '10.0.0.2', '172.20.0.3', 'demo.local', 'demo.test']) {
    const s = setup(host)
    assert.equal(typeof s.api.startAnalytics, 'function')
    s.api.startAnalytics(true, 'G-RH2J4YXLP3')
    s.api.trackEvent('project_open', { content_id: 'oboxsteam' })
    assert.equal(s.scripts.length, 0, host)
    assert.equal(s.calls.length, 0, host)
  }
  const s = setup()
  s.api.startAnalytics(false, 'G-RH2J4YXLP3')
  assert.equal(s.scripts.length, 0)
})

test('events allow only bounded identifiers and never arbitrary text, emails or query strings', () => {
  const s = setup()
  assert.equal(typeof s.api.startAnalytics, 'function')
  s.api.startAnalytics(true, 'G-RH2J4YXLP3')
  s.api.trackEvent('project_open', { content_id: 'oboxsteam', section_id: 'builds', email: 'person@example.com', action: 'open', destination: 'https://example.com/?email=secret', language: 'x'.repeat(101) })
  const payload = s.calls.at(-1)
  assert.equal(payload[0], 'event')
  assert.equal(payload[1], 'project_open')
  assert.deepEqual(JSON.parse(JSON.stringify(payload[2])), { send_to: 'G-RH2J4YXLP3', content_id: 'oboxsteam', section_id: 'builds', action: 'open' })
  const count = s.calls.length
  s.api.trackEvent('arbitrary event', { content_id: 'secret' })
  assert.equal(s.calls.length, count)
})

test('missing or throwing analytics cannot interrupt the caller', () => {
  const s = setup()
  assert.equal(typeof s.api.startAnalytics, 'function')
  s.api.startAnalytics(true, 'G-RH2J4YXLP3')
  delete s.window.gtag
  assert.doesNotThrow(() => s.api.trackEvent('resume_open'))
  s.window.gtag = () => { throw new Error('blocked provider') }
  assert.doesNotThrow(() => s.api.trackEvent('resume_open'))
})

test('sections require uninterrupted visible dwell and are counted once per page', () => {
  const api = load('../src/utils/analytics.ts')
  assert.equal(typeof api.createSectionDwell, 'function')
  const timers = new Map(), seen = []
  let next = 0
  const dwell = api.createSectionDwell(id => seen.push(id), callback => { timers.set(++next, callback); return next }, id => timers.delete(id))
  const flush = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()) }
  dwell.enter('builds'); dwell.leave('builds'); flush()
  assert.deepEqual(seen, [])
  dwell.enter('builds'); dwell.pause(); flush()
  assert.deepEqual(seen, [])
  dwell.resume(); flush()
  assert.deepEqual(seen, ['builds'])
  dwell.leave('builds'); dwell.enter('builds'); flush()
  assert.deepEqual(seen, ['builds'])
})

test('section observation uses viewport height and rebuilds when the viewport changes', () => {
  const configurations = [], listeners = {}
  const window = { innerHeight: 900, IntersectionObserver: true, addEventListener: (name, handler) => { listeners[name] = handler } }
  const document = { hidden: false, documentElement: {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] }
  class Observer { constructor(callback, options) { configurations.push(options) } observe() {} disconnect() {} }
  class Mutations { observe() {} }
  const api = load('../src/utils/analytics.ts', { window, document, IntersectionObserver: Observer, MutationObserver: Mutations })
  api.installInteractionTracking()
  assert.equal(configurations[0].rootMargin, '-315px 0px -315px 0px')
  window.innerHeight = 500
  listeners.resize()
  assert.equal(configurations[1].rootMargin, '-175px 0px -175px 0px')
})

function recording(storageValue = null, blockedStorage = false) {
  const calls = [], values = new Map(storageValue ? [['portfolio-recordings', storageValue]] : [])
  const storage = { getItem: key => { if (blockedStorage) throw Error('blocked'); return values.get(key) ?? null }, setItem: (key, value) => { if (blockedStorage) throw Error('blocked'); values.set(key, value) } }
  const api = load('../src/utils/recording-consent.ts')
  assert.equal(typeof api.createRecordingConsent, 'function')
  const consent = api.createRecordingConsent({ storage, load: () => calls.push('load'), stop: () => calls.push('stop') })
  return { consent, calls, values }
}
test('recording is off until explicitly granted; stored grants resume and denial stops', () => {
  const s = recording()
  assert.deepEqual(s.calls, [])
  assert.equal(s.consent.choice, null)
  s.consent.setChoice('granted')
  s.consent.setChoice('granted')
  assert.deepEqual(s.calls, ['load'])
  s.consent.setChoice('denied')
  assert.deepEqual(s.calls, ['load', 'stop'])
  assert.equal(s.values.get('portfolio-recordings'), 'denied')
  assert.deepEqual(recording('granted').calls, ['load'])
  assert.deepEqual(recording('denied').calls, [])
  assert.deepEqual(recording('unexpected').calls, [])
})
test('recording honors cross-tab removal and works without persistent storage', () => {
  const s = recording(null, true)
  assert.doesNotThrow(() => s.consent.setChoice('granted'))
  assert.deepEqual(s.calls, ['load'])
  s.consent.syncChoice(null)
  assert.deepEqual(s.calls, ['load', 'stop'])
  assert.equal(s.consent.choice, null)
})
