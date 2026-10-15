import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
const exports = {}
const source = ts.transpileModule(readFileSync(new URL('../src/data/projectArchitectures.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
vm.runInNewContext(source, { exports, require: () => ({}) })
const { projectArchitectures } = exports
const nodesOf = architecture => [...architecture.layers.flatMap(layer => layer.nodes), ...(architecture.frame ? [architecture.frame] : [])]

test('every project has an architecture whose tools appear exactly once', () => {
  assert.deepEqual(Object.keys(projectArchitectures).sort(), ['graphpaper', 'museums', 'oboxsteam'])
  for (const [id, architecture] of Object.entries(projectArchitectures)) {
    const tools = nodesOf(architecture).flatMap(node => node.tools)
    assert.ok(tools.length > 0, `${id} lists no tools`)
    assert.equal(new Set(tools).size, tools.length, `${id} repeats a tool`)
  }
})

test('architecture links resolve, are reciprocal, and the outer layer only reaches the centre', () => {
  for (const [id, architecture] of Object.entries(projectArchitectures)) {
    const nodes = nodesOf(architecture)
    const byId = new Map(nodes.map(node => [node.id, node]))
    assert.ok(byId.has(architecture.defaultNode), `${id} default node`)
    const centre = architecture.layers.find(layer => layer.connect === 'none').nodes.map(node => node.id)
    for (const node of architecture.layers[0].nodes) assert.ok(node.links.every(link => centre.includes(link)), `${id}/${node.id} bypasses the centre`)
    for (const node of nodes) for (const link of node.links) {
      assert.ok(byId.has(link), `${id}/${node.id} links to unknown ${link}`)
      if (node !== architecture.frame) assert.ok(byId.get(link).links.includes(node.id), `${id}: ${link} does not link back to ${node.id}`)
    }
  }
})

test('unbuilt parts are marked as intended rather than listed with tools', () => {
  for (const architecture of Object.values(projectArchitectures)) {
    for (const node of nodesOf(architecture).filter(node => node.status === 'intended')) assert.equal(node.tools.length, 0)
  }
})
