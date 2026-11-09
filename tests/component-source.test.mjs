import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { splitComponentSource } from '../src/utils/component-source.mjs'

for (const [id, name] of [['cutout', 'Scraps'], ['emulsion', 'Fieldnotes'], ['reverie', 'Daydream']]) {
  test(`${name} exports matching titles and runnable companion filenames`, async () => {
    const source = await readFile(new URL(`../public/components/${id}.html`, import.meta.url), 'utf8')
    const files = splitComponentSource(source, id)
    const filename = name.toLowerCase()
    assert.ok(files.html.includes(`<title>${name}`), 'standalone title uses the public name')
    assert.ok(files.html.includes(`href="./${filename}.css"`), 'HTML points to the downloaded stylesheet')
    assert.ok(files.html.includes(`src="./${filename}.js"`), 'HTML points to the downloaded script')
    assert.ok(files.css.trim() && files.js.trim(), 'companion files keep their implementation')
  })
}
