import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
function dataModule(path) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, { exports, require: () => ({}) })
  return exports
}
const { oboxArchitecture } = dataModule('../src/data/oboxArchitecture.ts')
const { projectStacks } = dataModule('../src/data/projectStacks.ts')
const nodes = [...oboxArchitecture.layers.flatMap(layer => layer.nodes), oboxArchitecture.frame]

test('the architecture map places every OboxSTEAM technology exactly once', () => {
  const mapped = nodes.flatMap(node => node.tools)
  const stack = projectStacks.oboxsteam.groups.flatMap(group => group.tools)
  assert.deepEqual([...mapped].sort(), [...stack].sort())
  assert.equal(new Set(mapped).size, mapped.length)
})

test('architecture links are reciprocal and clients only reach the API', () => {
  const byId = new Map(nodes.map(node => [node.id, node]))
  assert.ok(byId.has(oboxArchitecture.defaultNode))
  for (const node of nodes) for (const link of node.links) assert.ok(byId.has(link), `${node.id} links to unknown ${link}`)
  for (const node of oboxArchitecture.layers[0].nodes) assert.deepEqual([...node.links], ['api'])
  for (const node of oboxArchitecture.layers.flatMap(layer => layer.nodes)) {
    for (const link of node.links) if (link !== oboxArchitecture.frame.id) assert.ok(byId.get(link).links.includes(node.id), `${link} does not link back to ${node.id}`)
  }
})
