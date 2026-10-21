import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const ts = createRequire(import.meta.url)('typescript')
const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/data/projectArchitectures.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports })
const { projectArchitectures: projects } = exports

test('portfolio overviews stay small, connected and grounded in source evidence', () => {
  assert.deepEqual(Object.keys(projects).sort(), ['graphpaper', 'museums', 'oboxsteam'])
  for (const [id, graph] of Object.entries(projects)) {
    assert.ok(graph.nodes.length <= 4, `${id} has too many competing parts`)
    assert.equal(new Set(graph.nodes.map(node => node.kind)).size, graph.nodes.length, `${id} repeats a device silhouette`)
    const ids = new Set(graph.nodes.map(node => node.id))
    assert.equal(ids.size, graph.nodes.length)
    assert.ok(ids.has(graph.defaultNode))
    assert.equal(graph.edges.length, graph.nodes.length - 1, `${id} should have one clear, connected topology`)
    const edges = new Set()
    for (const edge of graph.edges) {
      assert.ok(ids.has(edge.from) && ids.has(edge.to))
      const key = `${edge.from}-${edge.to}`
      assert.ok(!edges.has(key)); edges.add(key)
    }
    for (const node of graph.nodes) {
      assert.match(node.source, /^https:\/\/github.com\//)
      assert.ok(graph.edges.some(edge => edge.from === node.id || edge.to === node.id))
      assert.ok(node.tools.length <= 4, 'bubbles contain only the supporting stack')
      assert.ok(node.note.split(/\s+/).length <= 30, 'inspection copy stays concise')
    }
  }
})

test('GraphPaper retains the implemented processing story without promoting planned answers', () => {
  const graph = projects.graphpaper
  const analysis = graph.nodes.find(node => node.id === 'analysis')
  assert.match(analysis.note, /Gemini embeddings/)
  assert.match(analysis.note, /Ollama extraction/)
  assert.match(graph.nodes.find(node => node.id === 'knowledge').stack, /pgvector/)
  assert.match(graph.nodes.find(node => node.id === 'workspace').note, /Grounded answers remain an intended extension/)
})

test('Obox clients access a shared backend and background work stays in process', () => {
  const graph = projects.oboxsteam
  assert.equal(graph.edges.filter(edge => edge.from === 'clients').map(edge => edge.to).join(), 'api')
  assert.match(graph.nodes.find(node => node.id === 'api').note, /in-process/)
  assert.match(graph.nodes.find(node => node.id === 'media').note, /SNS callbacks/)
  assert.ok(!graph.nodes.flatMap(node => node.tools).some(tool => /SQS|Redis|RabbitMQ/.test(tool)))
})

test('museum overview keeps the independent browser experiences distinct', () => {
  const graph = projects.museums
  assert.match(graph.nodes.find(node => node.id === 'foundation').note, /not a shared backend/)
  assert.match(graph.nodes.find(node => node.id === 'democracy').note, /browser hook calls Gemini when configured/)
  assert.match(graph.nodes.find(node => node.id === 'history').note, /React browser state/)
})
