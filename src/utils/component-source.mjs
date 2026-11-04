// Split our self-contained demos at build time; no parser or highlighter ships to the browser.
export function splitComponentSource(source, id) {
  const dedent = text => {
    const lines = text.replace(/^\r?\n|\s+$/g, '').split(/\r?\n/)
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length))
    return lines.map(line => line.slice(indent)).join('\n') + '\n'
  }
  let css = '', js = ''
  const html = source
    .replace(/<style>([\s\S]*?)<\/style>/, (_, content) => {
      css = dedent(content)
      return `<link rel="stylesheet" href="./${id}.css" />`
    })
    .replace(/<script>([\s\S]*?)<\/script>/, (_, content) => {
      js = dedent(content)
      return `<script src="./${id}.js"></script>`
    })
  if (!css || !js) throw new Error(`Missing source blocks for ${id}`)
  return { html, css, js }
}
