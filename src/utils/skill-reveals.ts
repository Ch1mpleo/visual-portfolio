/** Keep the original card wipe, but give visible cards their own start times. */
export function setupSkillReveals(skills: Iterable<HTMLElement>) {
  const remaining = new Set(skills)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  if (!remaining.size) return

  const revealAll = () => {
    remaining.forEach((skill) => skill.classList.add('is-revealed'))
    remaining.clear()
  }

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealAll()
    return
  }

  // Choose the order once per visit; scrolling back never reshuffles open cards.
  const order = new Map([...remaining].map((skill) => [skill, Math.random()]))
  let frame = 0
  let timer = 0
  let lastReveal = -Infinity
  let gap = 0
  let lastScrollY = window.scrollY
  let lastScrollAt = performance.now()
  let scrollSpeed = 0

  const observer = new IntersectionObserver(requestCheck, {
    threshold: [0, 0.5],
  })

  function requestCheck() {
    if (!frame) frame = window.requestAnimationFrame(check)
  }

  function check() {
    frame = 0
    window.clearTimeout(timer)

    if (reducedMotion.matches) {
      revealAll()
      cleanup()
      return
    }

    if (document.hidden) return

    const candidates = [...remaining]
      .map((skill) => ({ skill, rect: skill.getBoundingClientRect() }))
      .filter(({ rect }) => {
        const visibleHeight =
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)

        // A card taller than a short/zoomed viewport must still be revealable.
        const requiredHeight = Math.min(rect.height, window.innerHeight) * 0.5
        return (
          rect.height > 0 &&
          rect.right > 0 &&
          rect.left < window.innerWidth &&
          visibleHeight >= requiredHeight
        )
      })
      .sort((a, b) => a.rect.top - b.rect.top)

    if (!candidates.length) return

    const now = performance.now()
    const fastScrolling = scrollSpeed > 1.5 && now - lastScrollAt < 160
    const wait = lastReveal + (fastScrolling ? Math.min(gap, 90) : gap) - now

    if (wait > 0) {
      timer = window.setTimeout(requestCheck, wait)
      return
    }

    // Keep rows in reading order, with either neighbor able to lead its row.
    const firstRow = candidates.filter(
      ({ rect }) => Math.abs(rect.top - candidates[0].rect.top) < 2,
    )
    firstRow.sort((a, b) => order.get(a.skill)! - order.get(b.skill)!)
    const { skill } = firstRow[0]

    skill.classList.add('is-revealed')
    remaining.delete(skill)
    observer.unobserve(skill)
    lastReveal = now
    gap = 210 + Math.random() * 130

    // Measure the next delay from the actual start, even after a background tab.
    if (remaining.size) requestCheck()
    else cleanup()
  }

  function onScroll() {
    const now = performance.now()
    scrollSpeed =
      Math.abs(window.scrollY - lastScrollY) / Math.max(16, now - lastScrollAt)
    lastScrollY = window.scrollY
    lastScrollAt = now
    requestCheck()
  }

  function cleanup() {
    window.cancelAnimationFrame(frame)
    window.clearTimeout(timer)
    observer.disconnect()
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', requestCheck)
    document.removeEventListener('visibilitychange', requestCheck)
    reducedMotion.removeEventListener('change', requestCheck)
  }

  remaining.forEach((skill) => observer.observe(skill))
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', requestCheck, { passive: true })
  document.addEventListener('visibilitychange', requestCheck)
  reducedMotion.addEventListener('change', requestCheck)
  requestCheck()
}
