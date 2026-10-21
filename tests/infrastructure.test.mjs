import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const ts = createRequire(import.meta.url)('typescript')
function moduleOf(path) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports })
  return exports
}
const { bubblePosition, infrastructureModel, connectionPath } = moduleOf('../src/components/builds/infrastructure/model.ts')
const { projectArchitectures: projects } = moduleOf('../src/data/projectArchitectures.ts')

test('inspection bubbles stay within the visible canvas near every edge, including phone width', () => {
  for (const viewport of [{ w: 350, h: 600 }, { w: 1200, h: 700 }]) {
    const bubble = { w: 320, h: 360 }
    for (const anchor of [{ x: 0, y: 0, w: 150, h: 120 }, { x: viewport.w - 160, y: viewport.h - 130, w: 150, h: 120 }, { x: viewport.w / 2, y: 200, w: 150, h: 120 }]) {
      const pos = bubblePosition(anchor, viewport, bubble)
      assert.ok(pos.x >= 12 && pos.x + bubble.w <= viewport.w - 12)
      assert.ok(pos.y >= 12 && pos.y + bubble.h <= viewport.h - 12)
    }
  }
})
test('core flow endpoints remain resolvable in both the desktop and narrow layout', () => {
  for (const graph of Object.values(projects)) {
    for (const edge of infrastructureModel(graph).connections) {
      assert.ok(edge.fromNode && edge.toNode)
      for (const stacked of [false, true]) {
        const path = connectionPath(stacked ? [98, 130] : edge.fromNode.at, stacked ? [98, 310] : edge.toNode.at, stacked)
        assert.ok(!/NaN|undefined|Infinity/.test(path))
      }
    }
  }
})
test('desktop objects and labels have independent space around them', () => {
  for (const graph of Object.values(projects)) for (const a of graph.nodes) {
    assert.ok(a.at[0] >= 118 && a.at[0] <= graph.width - 118)
    assert.ok(a.at[1] >= 130 && a.at[1] + 125 <= graph.height)
    for (const b of graph.nodes) if (a !== b) assert.ok(Math.abs(a.at[0] - b.at[0]) >= 250 || Math.abs(a.at[1] - b.at[1]) >= 230, `${a.id}/${b.id} overlap`)
  }
})
