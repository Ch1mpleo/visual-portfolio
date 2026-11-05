/** A small ASCII field driven by the playing clip's frequency spectrum. */
export function createMusicVisualizer(
  canvas: HTMLCanvasElement,
  panel: HTMLElement,
  player: HTMLElement,
  getVolume: () => number,
) {
  const context = canvas.getContext('2d')
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const glyphs = ' .:-=+*#%@'
  let analyser: AnalyserNode | undefined
  let spectrum = new Uint8Array(0)
  let playing = false
  let frame = 0
  let previousTime = 0
  let phase = 0
  let width = 0
  let height = 0

  function paint(time: number) {
    if (!context || !width || !height) return
    const active = playing && !motion.matches && getVolume() > 0
    if (active && analyser) analyser.getByteFrequencyData(spectrum)
    else spectrum.fill(0)

    let energy = 0
    for (let index = 1; index < 48; index++) energy += spectrum[index] || 0
    energy = energy / (47 * 255) * getVolume()
    const bass = ((spectrum[1] || 0) + (spectrum[2] || 0) + (spectrum[3] || 0)) / 765 * getVolume()
    if (active) phase += Math.min(time - previousTime, 80) / 1000 * (.2 + bass * .7)
    previousTime = time
    player.style.setProperty('--music-energy', energy.toFixed(3))
    player.style.setProperty('--music-bass', bass.toFixed(3))
    player.style.setProperty('--music-drift', `${Math.sin(phase) * 12}px`)
    context.clearRect(0, 0, width, height)
    context.font = '9px ui-monospace, SFMono-Regular, Consolas, monospace'
    context.textBaseline = 'middle'

    const columns = Math.ceil(width / 7)
    const rows = Math.ceil(height / 10)
    for (let column = 0; column < columns; column++) {
      const band = Math.min(100, 1 + Math.floor((column / columns) ** 1.7 * 90))
      const amplitude = (spectrum[band] || 0) / 255 * getVolume()
      for (let row = 0; row < rows; row++) {
        const x = column / columns
        const y = row / rows
        const noise = (Math.sin(column * 1.73 + row * 2.39) + 1) / 2
        const wave = Math.sin(x * 12 - phase * 2 + y * 5) * (.18 + amplitude * .4)
        const ribbon = Math.max(0, 1 - Math.abs(y - (.65 + wave)) * 3.6)
        const density = Math.min(1, noise * .24 + ribbon * (.2 + amplitude * .74))
        const glyph = glyphs[Math.min(glyphs.length - 1, Math.floor(density * glyphs.length))]
        const opacity = .08 + ribbon * (.16 + amplitude * .4)
        // Warm gold from the record blends into moss and muted emerald.
        context.fillStyle = x < .35
          ? `rgba(193, 173, 111, ${opacity})`
          : `rgba(101, 194, 137, ${opacity})`
        context.fillText(glyph, column * 7, row * 10 + 5)
      }
    }
  }

  function tick(time: number) {
    frame = requestAnimationFrame(tick)
    if (time - previousTime >= 1000 / 24) paint(time)
  }

  function refresh() {
    cancelAnimationFrame(frame)
    frame = 0
    previousTime = performance.now()
    paint(previousTime)
    if (playing && analyser && player.classList.contains('is-expanded') && !document.hidden && !motion.matches) {
      frame = requestAnimationFrame(tick)
    }
  }

  const observer = new ResizeObserver(() => {
    width = panel.clientWidth
    height = panel.clientHeight
    const scale = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    context?.setTransform(scale, 0, 0, scale, 0, 0)
    refresh()
  })
  observer.observe(panel)
  motion.addEventListener('change', refresh)
  document.addEventListener('visibilitychange', refresh)

  return {
    connect(node: AnalyserNode) {
      analyser = node
      spectrum = new Uint8Array(node.frequencyBinCount)
      refresh()
    },
    setPlaying(active: boolean) {
      playing = active
      refresh()
    },
    refresh,
  }
}
