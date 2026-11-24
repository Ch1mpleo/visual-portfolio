export interface TurntableCallbacks {
  onSeek: (seconds: number) => void
  onVolume: (percent: number) => void
  onTogglePlay: () => void
  onScratchStart?: () => void
  onScratchEnd?: (seconds: number) => void
  onInteractChange?: (active: boolean) => void
}

/**
 * Coordinates 1:1 tactile vinyl scratching, instant tonearm needle drop/sweep,
 * and the vertical 3D fader slider on the turntable deck.
 */
export function createTurntable(
  player: HTMLElement,
  initialVolume: number,
  callbacks: TurntableCallbacks,
) {
  const platter = player.querySelector<HTMLElement>('[data-music-platter]')!
  const cue = player.querySelector<HTMLElement>('[data-music-cue]')!
  const tonearmPivot = player.querySelector<HTMLElement>('[data-music-tonearm-pivot]')!
  const tonearmHandle = player.querySelector<HTMLElement>('[data-music-tonearm-handle]')!
  const fader = player.querySelector<HTMLElement>('[data-music-fader]')!
  const [faderTop, faderBottom] = fader.querySelectorAll<HTMLElement>('[data-music-fader-stop]')

  const armOuterDeg = 22
  const armInnerDeg = 44
  // One full 360-degree hand spin scrubs 48 seconds while keeping visual vinyl rotation 1:1 with the hand.
  const secondsPerTurn = 48

  let duration = 0
  let position = 0
  let visualCueDeg = 0
  let volume = -1
  let settling: ReturnType<typeof setTimeout>

  let platterPointer: number | null = null
  let previousAngle = 0
  let dragPosition = 0
  let lastSeekCommit = 0

  let armPointer: number | null = null
  let armStartX = 0
  let armStartY = 0
  let armDragged = false

  let faderDrag: {
    pointerId: number
    project: (event: PointerEvent) => number
    previous: number
    level: number
  } | null = null

  function formatTime(seconds: number) {
    const value = Math.floor(seconds)
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
  }

  function setInteracting(active: boolean) {
    callbacks.onInteractChange?.(active)
  }

  function isActivelyScrubbing() {
    return platterPointer !== null || (armPointer !== null && armDragged)
  }

  function applyVisualPosition(seconds: number, cueDeg?: number) {
    position = duration ? Math.max(0, Math.min(duration, seconds)) : 0
    const progress = duration ? position / duration : 0
    if (typeof cueDeg === 'number') {
      visualCueDeg = cueDeg
    } else {
      visualCueDeg = progress * (duration ? (duration / secondsPerTurn) * 360 : 0)
    }
    cue.style.setProperty('--cue-angle', `${visualCueDeg.toFixed(2)}deg`)
    player.style.setProperty(
      '--tonearm-angle',
      `${(armOuterDeg + progress * (armInnerDeg - armOuterDeg)).toFixed(2)}deg`,
    )
    platter.setAttribute('aria-valuenow', String(position))
    platter.setAttribute(
      'aria-valuetext',
      duration ? `${formatTime(position)} of ${formatTime(duration)}` : 'Audio not loaded',
    )
  }

  function beginCue() {
    clearTimeout(settling)
    player.classList.add('is-scrubbing')
    player.classList.remove('is-cueing')
    setInteracting(true)
    callbacks.onScratchStart?.()
  }

  function endCue(finalSeconds?: number) {
    player.classList.remove('is-scrubbing')
    player.classList.add('is-cueing')
    setInteracting(false)
    if (typeof finalSeconds === 'number' && duration) {
      callbacks.onScratchEnd?.(Math.max(0, Math.min(duration, finalSeconds)))
    }
    clearTimeout(settling)
    settling = setTimeout(() => player.classList.remove('is-cueing'), 420)
  }

  function cueTo(seconds: number, commitImmediate = true) {
    if (!duration) return
    const clamped = Math.max(0, Math.min(seconds, duration))
    if (!player.classList.contains('is-scrubbing')) {
      applyVisualPosition(clamped)
      endCue()
      callbacks.onSeek(clamped)
      return
    }
    const now = performance.now()
    if (commitImmediate || now - lastSeekCommit >= 45) {
      lastSeekCommit = now
      callbacks.onSeek(clamped)
    }
  }

  function syncVolumeUI(next: number) {
    const rounded = Math.max(0, Math.min(100, Math.round(next)))
    if (volume === rounded) return
    volume = rounded
    player.style.setProperty('--volume-level', `${volume}%`)
    player.style.setProperty('--fader-ratio', (volume / 100).toFixed(4))
    fader.setAttribute('aria-valuenow', String(volume))
    fader.setAttribute('aria-valuetext', `${volume} percent`)
    callbacks.onVolume(volume)
  }

  function platterAngle(event: PointerEvent) {
    const bounds = platter.getBoundingClientRect()
    return (
      (Math.atan2(
        event.clientY - bounds.y - bounds.height / 2,
        event.clientX - bounds.x - bounds.width / 2,
      ) *
        180) /
      Math.PI
    )
  }

  /* 1. Snappy 1:1 vinyl platter scratch (zero lag, zero resistance) */
  platter.addEventListener('pointerdown', (event) => {
    if (!duration || platterPointer !== null || faderDrag || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    platterPointer = event.pointerId
    previousAngle = platterAngle(event)
    dragPosition = position
    lastSeekCommit = 0
    platter.setPointerCapture(platterPointer)
    platter.focus({ preventScroll: true })
    beginCue()
  })

  platter.addEventListener('pointermove', (event) => {
    if (platterPointer !== event.pointerId || !duration) return
    const nextAngle = platterAngle(event)
    const delta = ((nextAngle - previousAngle + 540) % 360) - 180
    previousAngle = nextAngle
    const nextPos = Math.max(0, Math.min(duration, dragPosition + (delta / 360) * secondsPerTurn))
    const actualDeltaSec = nextPos - dragPosition
    dragPosition = nextPos
    // Lock visual vinyl spin 1:1 to hand motion so it never resists or slips behind.
    const nextCueDeg = visualCueDeg + (actualDeltaSec / secondsPerTurn) * 360
    applyVisualPosition(dragPosition, nextCueDeg)
    cueTo(dragPosition, false)
  })

  function releasePlatter(event: PointerEvent) {
    if (platterPointer !== event.pointerId) return
    const target = dragPosition
    platterPointer = null
    if (platter.hasPointerCapture(event.pointerId)) platter.releasePointerCapture(event.pointerId)
    applyVisualPosition(target, visualCueDeg)
    endCue(target)
  }

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    platter.addEventListener(type, releasePlatter)
  }

  platter.addEventListener('keydown', (event) => {
    if (!duration) return
    const targets: Record<string, number> = {
      ArrowLeft: position - 5,
      ArrowDown: position - 5,
      ArrowRight: position + 5,
      ArrowUp: position + 5,
      PageDown: position - 15,
      PageUp: position + 15,
      Home: 0,
      End: duration,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    cueTo(targets[event.key], true)
  })

  /* 2. Direct 3D tonearm headshell sweep (0%..100% in one fluid motion, or tap to play) */
  function seekFromArmPointer(event: PointerEvent) {
    if (!duration) return
    const pivotRect = tonearmPivot.getBoundingClientRect()
    const px = pivotRect.left + pivotRect.width / 2
    const py = pivotRect.top + pivotRect.height / 2
    const rad = Math.atan2(px - event.clientX, event.clientY - py)
    const deg = (rad * 180) / Math.PI
    const clamped = Math.max(armOuterDeg, Math.min(armInnerDeg, deg))
    const progress = (clamped - armOuterDeg) / (armInnerDeg - armOuterDeg)
    dragPosition = progress * duration
    applyVisualPosition(dragPosition)
    cueTo(dragPosition, false)
  }

  tonearmHandle.addEventListener('pointerdown', (event) => {
    if (armPointer !== null || faderDrag || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    armPointer = event.pointerId
    armStartX = event.clientX
    armStartY = event.clientY
    armDragged = false
    dragPosition = position
    lastSeekCommit = 0
    tonearmHandle.setPointerCapture(armPointer)
    setInteracting(true)
  })

  tonearmHandle.addEventListener('pointermove', (event) => {
    if (armPointer !== event.pointerId) return
    if (!armDragged && Math.hypot(event.clientX - armStartX, event.clientY - armStartY) > 4) {
      armDragged = true
      if (duration) beginCue()
    }
    if (armDragged && duration) seekFromArmPointer(event)
  })

  function releaseArm(event: PointerEvent) {
    if (armPointer !== event.pointerId) return
    const wasDrag = armDragged
    const target = dragPosition
    armPointer = null
    armDragged = false
    if (tonearmHandle.hasPointerCapture(event.pointerId)) {
      tonearmHandle.releasePointerCapture(event.pointerId)
    }
    if (wasDrag && duration) {
      endCue(target)
    } else {
      setInteracting(false)
      if (event.type === 'pointerup') callbacks.onTogglePlay()
    }
  }

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    tonearmHandle.addEventListener(type, releaseArm)
  }

  fader.addEventListener('pointerdown', (event) => {
    if (faderDrag || platterPointer !== null || armPointer !== null || event.button !== 0) return
    if (player.classList.contains('is-orbiting')) return

    const top = faderTop.getBoundingClientRect()
    const bottom = faderBottom.getBoundingClientRect()
    const dx = top.x - bottom.x
    const dy = top.y - bottom.y
    const lengthSquared = dx * dx + dy * dy
    if (lengthSquared < 1) return

    const project = (pointer: PointerEvent) =>
      100 * ((pointer.clientX - bottom.x) * dx + (pointer.clientY - bottom.y) * dy) / lengthSquared
    const previous = project(event)
    const grabbedCap = (event.target as Element).closest('[data-music-fader-grip]')
    const level = grabbedCap ? volume : Math.max(0, Math.min(100, previous))

    event.preventDefault()
    event.stopPropagation()
    faderDrag = { pointerId: event.pointerId, project, previous, level }
    fader.setPointerCapture(event.pointerId)
    fader.focus({ preventScroll: true })
    player.classList.add('is-sliding-fader')
    setInteracting(true)
    syncVolumeUI(level)
  })

  function moveFader(event: PointerEvent) {
    if (faderDrag?.pointerId !== event.pointerId) return
    const next = faderDrag.project(event)
    faderDrag.level = Math.max(0, Math.min(100, faderDrag.level + next - faderDrag.previous))
    faderDrag.previous = next
    syncVolumeUI(faderDrag.level)
  }

  function releaseFader() {
    if (!faderDrag) return
    const { pointerId } = faderDrag
    faderDrag = null
    player.classList.remove('is-sliding-fader')
    setInteracting(false)
    if (fader.hasPointerCapture(pointerId)) fader.releasePointerCapture(pointerId)
  }

  fader.addEventListener('pointermove', moveFader)
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    fader.addEventListener(type, (event) => {
      if (faderDrag?.pointerId !== event.pointerId) return
      if (type === 'pointerup') moveFader(event)
      releaseFader()
    })
  }
  fader.addEventListener('blur', releaseFader)

  fader.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (faderDrag || !event.deltaY) return
      const delta = event.deltaY < 0 ? 5 : -5
      syncVolumeUI(volume + delta)
    },
    { passive: false },
  )

  fader.addEventListener('keydown', (event) => {
    const targets: Record<string, number> = {
      ArrowUp: volume + 1,
      ArrowRight: volume + 1,
      ArrowDown: volume - 1,
      ArrowLeft: volume - 1,
      PageUp: volume + 10,
      PageDown: volume - 10,
      Home: 0,
      End: 100,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    if (faderDrag) return
    syncVolumeUI(targets[event.key])
  })

  syncVolumeUI(initialVolume)

  return {
    beginCue,
    endCue,
    cueTo,
    setVolume: syncVolumeUI,
    getVolume: () => volume,
    update(seconds: number, total: number) {
      duration = total
      platter.tabIndex = total ? 0 : -1
      platter.setAttribute('aria-disabled', String(!total))
      platter.setAttribute('aria-valuemax', String(total))
      // Never let async audio timeupdate fight the user's hand while scrubbing.
      if (isActivelyScrubbing()) return
      applyVisualPosition(seconds)
    },
  }
}
