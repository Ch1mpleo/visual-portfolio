/** The record, tonearm and timeline share one position in the audio. */
export function createTurntable(player: HTMLElement, onSeek: (seconds: number) => void) {
  const platter = player.querySelector<HTMLElement>('[data-music-platter]')!
  const cue = player.querySelector<HTMLElement>('[data-music-cue]')!
  let duration = 0
  let position = 0
  let pointer: number | null = null
  let previousAngle = 0
  let dragPosition = 0
  let settling: ReturnType<typeof setTimeout>

  function formatTime(seconds: number) {
    const value = Math.floor(seconds)
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
  }

  function beginCue() {
    clearTimeout(settling)
    player.classList.add('is-scrubbing')
    player.classList.remove('is-cueing')
  }

  function endCue() {
    player.classList.remove('is-scrubbing')
    player.classList.add('is-cueing')
    clearTimeout(settling)
    settling = setTimeout(() => player.classList.remove('is-cueing'), 620)
  }

  function cueTo(seconds: number) {
    if (!duration) return
    if (!player.classList.contains('is-scrubbing')) endCue()
    onSeek(Math.max(0, Math.min(seconds, duration)))
  }

  function angle(event: PointerEvent) {
    const bounds = platter.getBoundingClientRect()
    return Math.atan2(event.clientY - bounds.y - bounds.height / 2, event.clientX - bounds.x - bounds.width / 2) * 180 / Math.PI
  }

  platter.addEventListener('pointerdown', (event) => {
    if (!duration || pointer !== null || event.button !== 0) return
    event.preventDefault()
    pointer = event.pointerId
    previousAngle = angle(event)
    dragPosition = position
    platter.setPointerCapture(pointer)
    platter.focus({ preventScroll: true })
    beginCue()
  })
  platter.addEventListener('pointermove', (event) => {
    if (pointer !== event.pointerId) return
    const nextAngle = angle(event)
    // Unwrap crossing the -180/180 degree seam; one hand turn cues 12 seconds.
    const delta = ((nextAngle - previousAngle + 540) % 360) - 180
    previousAngle = nextAngle
    dragPosition = Math.max(0, Math.min(duration, dragPosition + delta / 360 * 12))
    cueTo(dragPosition)
  })
  function release(event: PointerEvent) {
    if (pointer !== event.pointerId) return
    pointer = null
    if (platter.hasPointerCapture(event.pointerId)) platter.releasePointerCapture(event.pointerId)
    endCue()
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) platter.addEventListener(event, release)
  platter.addEventListener('keydown', (event) => {
    if (!duration) return
    const targets: Record<string, number> = {
      ArrowLeft: position - 5, ArrowDown: position - 5,
      ArrowRight: position + 5, ArrowUp: position + 5,
      Home: 0, End: duration,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    cueTo(targets[event.key])
  })

  return {
    beginCue, endCue, cueTo,
    update(seconds: number, total: number) {
      position = seconds
      duration = total
      const progress = total ? seconds / total : 0
      // Four revolutions across the timeline make forward/backward cues visible.
      cue.style.setProperty('--cue-angle', `${progress * 1440}deg`)
      player.style.setProperty('--tonearm-angle', `${14 + progress * 18}deg`)
      platter.tabIndex = total ? 0 : -1
      platter.setAttribute('aria-disabled', String(!total))
      platter.setAttribute('aria-valuemax', String(total))
      platter.setAttribute('aria-valuenow', String(seconds))
      platter.setAttribute('aria-valuetext', total ? `${formatTime(seconds)} of ${formatTime(total)}` : 'Audio not loaded')
    },
  }
}
