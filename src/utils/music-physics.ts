export interface SpringState {
  value: number
  velocity: number
}

/** Advance a damped harmonic spring by dt seconds (clamped for tab-switch safety). */
export function stepSpring(
  spring: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): boolean {
  const step = Math.min(dt, 0.04)
  const force = (target - spring.value) * stiffness
  const accel = force - spring.velocity * damping
  spring.velocity += accel * step
  spring.value += spring.velocity * step

  if (Math.abs(target - spring.value) < 0.0015 && Math.abs(spring.velocity) < 0.004) {
    spring.value = target
    spring.velocity = 0
    return false
  }
  return true
}

/** Shortest signed angle in (-180, 180] from current to target degrees. */
export function shortestAngleDelta(current: number, target: number): number {
  return ((((target - current) % 360) + 540) % 360) - 180
}

/**
 * Drives the floating 3D turntable's spring levitation, hover-zoom enlargement,
 * hinged acrylic dust cover, cursor tilt, 360-degree inertia orbit, and bass suspension.
 */
export function createTurntablePhysics(
  player: HTMLElement,
  stage: HTMLElement,
  getVolume: () => number,
) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const restRx = 42
  const focusRx = 33
  const restRz = -6

  const openSpring: SpringState = { value: 0, velocity: 0 }
  const hoverZoom: SpringState = { value: 0, velocity: 0 }
  const tiltX: SpringState = { value: 0, velocity: 0 }
  const tiltY: SpringState = { value: 0, velocity: 0 }
  const orbitX: SpringState = { value: 0, velocity: 0 }
  const orbitY: SpringState = { value: 0, velocity: 0 }

  let targetOpen = 0
  let targetHoverZoom = 0
  let targetTiltX = 0
  let targetTiltY = 0
  let resettingOrbit = false
  let interactingControl = false
  let hoveringControl = false
  let orbiting = false
  let orbitPointer: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0
  let lastPointerTime = 0
  let lastTapTime = 0

  let analyser: AnalyserNode | undefined
  let spectrum = new Uint8Array(0)
  let playing = false
  let energy = 0
  let bass = 0
  let phase = 0

  let frame = 0
  let lastTick = 0

  const controlSelector =
    '[data-music-platter], [data-music-fader], [data-music-tonearm-handle], [data-music-deck-play]'

  function applyVars() {
    const open = openSpring.value
    const clampedOpen = Math.max(0, Math.min(1, open))
    const zoom = Math.max(0, Math.min(1.15, hoverZoom.value))
    const calmControls = interactingControl || hoveringControl || orbiting
    const bassLift = playing && !motion.matches && !calmControls ? bass * 3.4 : 0
    const floatBreath = playing && !motion.matches && !calmControls ? Math.sin(phase) * (0.85 + energy * 1.6) : 0
    const liftY = (1 - open) * 40 - zoom * 8 - bassLift - floatBreath
    const scale = 0.74 + open * 0.26 + zoom * 0.14
    const baseRx = restRx - zoom * (restRx - focusRx)
    const rx = baseRx + (1 - open) * 24 + tiltX.value + orbitX.value
    const ry = tiltY.value + orbitY.value
    const rz = restRz * clampedOpen * (1 - zoom * 0.45) + (1 - open) * 14
    // Hinged acrylic dust cover swings open smoothly as the deck levitates in.
    const lidAngle = Math.max(0, Math.min(68, clampedOpen * 54 + zoom * 10))

    player.style.setProperty('--float-open', clampedOpen.toFixed(4))
    player.style.setProperty('--deck-y', `${liftY.toFixed(2)}px`)
    player.style.setProperty('--deck-scale-anim', scale.toFixed(4))
    player.style.setProperty('--deck-rx', `${rx.toFixed(2)}deg`)
    player.style.setProperty('--deck-ry', `${ry.toFixed(2)}deg`)
    player.style.setProperty('--deck-rz', `${rz.toFixed(2)}deg`)
    player.style.setProperty('--lid-angle', `${lidAngle.toFixed(2)}deg`)
    player.style.setProperty('--shadow-scale', (0.58 + clampedOpen * 0.44 + zoom * 0.14 + bass * 0.07).toFixed(4))
    player.style.setProperty('--shadow-opacity', clampedOpen.toFixed(4))
    player.style.setProperty(
      '--shadow-x',
      `${(-tiltY.value * 0.85 - Math.sin((orbitY.value * Math.PI) / 180) * 12).toFixed(2)}px`,
    )
    player.style.setProperty('--shadow-y', `${(8 + clampedOpen * 18 + zoom * 5 + bassLift * 0.8).toFixed(2)}px`)
    applyAudioVars()
  }

  function applyAudioVars() {
    player.style.setProperty('--music-energy', energy.toFixed(3))
    player.style.setProperty('--music-bass', bass.toFixed(3))
  }

  function schedule() {
    if (frame || document.hidden) return
    lastTick = performance.now()
    frame = requestAnimationFrame(tick)
  }

  function sampleAudio(dt: number) {
    const active = playing && !motion.matches && getVolume() > 0 && targetOpen > 0
    if (active && analyser) {
      analyser.getByteFrequencyData(spectrum)
      let sum = 0
      for (let i = 1; i < 48; i++) sum += spectrum[i] || 0
      const targetEnergy = (sum / (47 * 255)) * getVolume()
      const targetBass =
        (((spectrum[1] || 0) + (spectrum[2] || 0) + (spectrum[3] || 0)) / 765) * getVolume()
      const blend = 1 - Math.exp(-dt * 14)
      energy += (targetEnergy - energy) * blend
      bass += (targetBass - bass) * blend
      phase += dt * (2.2 + bass * 4.5)
      return true
    }

    if (energy > 0.002 || bass > 0.002) {
      const decay = Math.exp(-dt * 10)
      energy *= decay
      bass *= decay
      if (energy < 0.002) energy = 0
      if (bass < 0.002) bass = 0
      return energy > 0 || bass > 0
    }
    energy = 0
    bass = 0
    return false
  }

  function tick(now: number) {
    frame = 0
    const dt = Math.min(Math.max((now - lastTick) / 1000, 0.001), 0.04)
    lastTick = now

    // Keep the measured rail or platter fixed while a gesture or animation targets it.
    if (player.classList.contains('is-sliding-fader') || player.classList.contains('is-catching-record')) {
      const active = sampleAudio(dt)
      applyAudioVars()
      if (active) frame = requestAnimationFrame(tick)
      return
    }

    if (motion.matches) {
      openSpring.value = targetOpen
      openSpring.velocity = 0
      hoverZoom.value = targetHoverZoom
      hoverZoom.velocity = 0
      tiltX.value = 0
      tiltX.velocity = 0
      tiltY.value = 0
      tiltY.velocity = 0
      if (resettingOrbit) {
        orbitX.value = 0
        orbitX.velocity = 0
        orbitY.value = 0
        orbitY.velocity = 0
        resettingOrbit = false
      }
      energy = 0
      bass = 0
      applyVars()
      return
    }

    let moving = false
    const openStiff = targetOpen > 0.5 ? 205 : 275
    const openDamp = targetOpen > 0.5 ? 14.8 : 23
    if (stepSpring(openSpring, targetOpen, openStiff, openDamp, dt)) moving = true

    const effZoom = targetOpen > 0.5 ? targetHoverZoom : 0
    if (stepSpring(hoverZoom, effZoom, 175, 16.5, dt)) moving = true

    const effTiltX = interactingControl || hoveringControl || orbiting ? 0 : targetTiltX
    const effTiltY = interactingControl || hoveringControl || orbiting ? 0 : targetTiltY
    if (stepSpring(tiltX, effTiltX, 150, 19, dt)) moving = true
    if (stepSpring(tiltY, effTiltY, 150, 19, dt)) moving = true

    if (resettingOrbit && !orbiting) {
      const oxMoving = stepSpring(orbitX, 0, 185, 20, dt)
      const oyMoving = stepSpring(orbitY, 0, 185, 20, dt)
      if (oxMoving || oyMoving) {
        moving = true
      } else {
        orbitX.value = 0
        orbitY.value = 0
        resettingOrbit = false
      }
    } else if (!orbiting && (Math.abs(orbitX.velocity) > 0.25 || Math.abs(orbitY.velocity) > 0.25)) {
      orbitX.value += orbitX.velocity * dt
      orbitY.value += orbitY.velocity * dt
      const drag = Math.exp(-dt * 4.4)
      orbitX.velocity *= drag
      orbitY.velocity *= drag
      if (Math.abs(orbitX.velocity) <= 0.25) orbitX.velocity = 0
      if (Math.abs(orbitY.velocity) <= 0.25) orbitY.velocity = 0
      moving = true
    }

    if (sampleAudio(dt)) moving = true
    applyVars()

    if (moving || orbiting) {
      frame = requestAnimationFrame(tick)
    }
  }

  function resetOrbit() {
    orbitX.value = -shortestAngleDelta(orbitX.value, 0)
    orbitY.value = -shortestAngleDelta(orbitY.value, 0)
    if (motion.matches) {
      orbitX.value = 0
      orbitX.velocity = 0
      orbitY.value = 0
      orbitY.velocity = 0
      resettingOrbit = false
      applyVars()
      return
    }
    if (Math.abs(orbitX.value) > 0.2 || Math.abs(orbitY.value) > 0.2 || orbitX.velocity || orbitY.velocity) {
      resettingOrbit = true
      schedule()
    }
  }

  stage.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && targetOpen > 0.5) {
      targetHoverZoom = 1
      schedule()
    }
  })

  stage.addEventListener('pointermove', (event) => {
    if (orbiting && event.pointerId === orbitPointer) {
      const now = performance.now()
      const dt = Math.max((now - lastPointerTime) / 1000, 0.004)
      const dx = event.clientX - lastPointerX
      const dy = event.clientY - lastPointerY
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      lastPointerTime = now

      const dRy = dx * 0.68
      const dRx = -dy * 0.56
      orbitY.value += dRy
      orbitX.value += dRx
      if (!motion.matches) {
        orbitY.velocity = orbitY.velocity * 0.45 + (dRy / dt) * 0.55
        orbitX.velocity = orbitX.velocity * 0.45 + (dRx / dt) * 0.55
        orbitY.velocity = Math.max(-720, Math.min(720, orbitY.velocity))
        orbitX.velocity = Math.max(-540, Math.min(540, orbitX.velocity))
      }
      applyVars()
      return
    }

    if (event.pointerType !== 'mouse' || targetOpen < 0.5 || motion.matches) return
    targetHoverZoom = 1
    const target = event.target as HTMLElement | null
    hoveringControl = Boolean(target?.closest(controlSelector))
    if (hoveringControl) {
      targetTiltX = 0
      targetTiltY = 0
      schedule()
      return
    }
    const rect = stage.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
    targetTiltY = Math.max(-1, Math.min(1, nx)) * 7
    targetTiltX = Math.max(-1, Math.min(1, -ny)) * 5.5
    schedule()
  })

  stage.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return
    hoveringControl = false
    if (!interactingControl && !orbiting) targetHoverZoom = 0
    targetTiltX = 0
    targetTiltY = 0
    schedule()
  })

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || orbitPointer !== null || interactingControl) return
    const target = event.target as HTMLElement | null
    if (!target || !target.closest('[data-music-plinth]') || target.closest(controlSelector)) return

    const now = performance.now()
    if (now - lastTapTime < 320) {
      lastTapTime = 0
      resetOrbit()
      return
    }
    lastTapTime = now

    event.preventDefault()
    orbitPointer = event.pointerId
    orbiting = true
    targetHoverZoom = 1
    resettingOrbit = false
    orbitX.velocity = 0
    orbitY.velocity = 0
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    lastPointerTime = now
    player.classList.add('is-orbiting')
    stage.setPointerCapture(orbitPointer)
    schedule()
  })

  function endOrbit(event: PointerEvent) {
    if (event.pointerId !== orbitPointer) return
    orbitPointer = null
    orbiting = false
    player.classList.remove('is-orbiting')
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    if (performance.now() - lastPointerTime > 90) {
      orbitX.velocity = 0
      orbitY.velocity = 0
    }
    schedule()
  }

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    stage.addEventListener(type, endOrbit)
  }

  stage.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement | null
    if (interactingControl || target?.closest(controlSelector)) return
    resetOrbit()
  })

  motion.addEventListener('change', () => schedule())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else {
      schedule()
    }
  })

  applyVars()

  return {
    setOpen(open: boolean, immediate = false) {
      const next = open ? 1 : 0
      if (targetOpen === next && !resettingOrbit && !immediate) return
      targetOpen = next
      if (!open) {
        targetHoverZoom = 0
        hoveringControl = false
        targetTiltX = 0
        targetTiltY = 0
        resetOrbit()
      }
      if (immediate) {
        openSpring.value = next
        openSpring.velocity = 0
        hoverZoom.value = targetHoverZoom
        hoverZoom.velocity = 0
        applyVars()
      }
      schedule()
    },
    setInteracting(active: boolean) {
      interactingControl = active
      if (active) {
        targetHoverZoom = 1
        targetTiltX = 0
        targetTiltY = 0
      }
      schedule()
    },
    connect(node: AnalyserNode) {
      analyser = node
      spectrum = new Uint8Array(node.frequencyBinCount)
      schedule()
    },
    setPlaying(active: boolean) {
      playing = active
      schedule()
    },
    refresh() {
      schedule()
    },
    resetOrbit,
    isOrbiting() {
      return orbiting
    },
  }
}
