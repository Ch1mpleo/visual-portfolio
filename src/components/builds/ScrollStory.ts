/**
 * A pinned illustration beside scrolling beats. The beat crossing the reading
 * line selects its illustrated object; selecting an object scrolls to its beat.
 *
 * Markup: [data-scroll-story] chapters contain [data-story-beat] items, a
 * [data-story-stage] with [data-story-layer] children, and optional
 * [data-story-object] hotspots whose ids match beat ids. A beat may name the
 * stage layer it shows with data-story-view (default "art").
 */
export class ScrollStory {
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private phone = matchMedia('(max-width: 767px)')
  private frame = 0
  private lockedUntil = 0

  constructor(private scroller: HTMLElement, private chapters: HTMLElement[]) {
    for (const chapter of chapters) {
      const objects = Array.from(chapter.querySelectorAll<SVGElement>('[data-story-object]'))
      objects.forEach((object, index) => {
        object.addEventListener('click', () => this.reveal(chapter, object.dataset.storyObject!))
        object.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.reveal(chapter, object.dataset.storyObject!); return }
          const next = event.key === 'ArrowRight' ? (index + 1) % objects.length : event.key === 'ArrowLeft' ? (index + objects.length - 1) % objects.length : event.key === 'Home' ? 0 : event.key === 'End' ? objects.length - 1 : -1
          if (next < 0) return
          event.preventDefault()
          this.reveal(chapter, objects[next].dataset.storyObject!)
          objects[next].focus({ preventScroll: true })
        })
      })
    }
    scroller.addEventListener('scroll', () => this.schedule(), { passive: true })
  }

  reset() {
    this.lockedUntil = 0
    for (const chapter of this.chapters) {
      const first = chapter.querySelector<HTMLElement>('[data-story-beat]')
      if (first) this.select(chapter, first.dataset.storyBeat!)
    }
  }

  select(chapter: HTMLElement, id: string) {
    if (chapter.dataset.activeBeat === id) return
    chapter.dataset.activeBeat = id
    let view = 'art'
    chapter.querySelectorAll<HTMLElement>('[data-story-beat]').forEach((beat) => {
      const selected = beat.dataset.storyBeat === id
      beat.classList.toggle('is-selected', selected)
      if (selected) view = beat.dataset.storyView ?? 'art'
    })
    const objects = Array.from(chapter.querySelectorAll<SVGElement>('[data-story-object]'))
    objects.forEach((object) => {
      object.classList.toggle('is-selected', object.dataset.storyObject === id)
      object.setAttribute('aria-pressed', String(object.dataset.storyObject === id))
    })
    const stage = chapter.querySelector<HTMLElement>('[data-story-stage]')
    if (!stage) return
    const index = objects.findIndex((object) => object.dataset.storyObject === id)
    stage.dataset.view = view
    if (index >= 0) stage.style.setProperty('--focus', String(index))
    stage.querySelectorAll<HTMLElement>('[data-story-layer]').forEach((layer) => layer.toggleAttribute('inert', layer.dataset.storyLayer !== view))
  }

  /** The reading line: a beat becomes active once its top crosses it. */
  private anchor() {
    const frame = this.scroller.getBoundingClientRect()
    return frame.top + frame.height * (this.phone.matches ? 0.68 : 0.5)
  }

  private schedule() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.sync() })
  }

  private sync() {
    // A hotspot jump owns the selection until its smooth scroll settles.
    if (Date.now() < this.lockedUntil) return
    const anchor = this.anchor()
    for (const chapter of this.chapters) {
      // Hidden projects have no layout and would otherwise select their last beat.
      if (chapter.getClientRects().length === 0) continue
      const beats = Array.from(chapter.querySelectorAll<HTMLElement>('[data-story-beat]'))
      let active = beats[0]
      for (const beat of beats) if (beat.getBoundingClientRect().top <= anchor) active = beat
      if (active) this.select(chapter, active.dataset.storyBeat!)
    }
  }

  private reveal(chapter: HTMLElement, id: string) {
    const beat = chapter.querySelector<HTMLElement>(`[data-story-beat="${id}"]`)
    if (!beat) return
    this.select(chapter, id)
    const instant = this.reducedMotion.matches
    this.lockedUntil = instant ? 0 : Date.now() + 900
    this.scroller.scrollTo({ top: this.scroller.scrollTop + beat.getBoundingClientRect().top - this.anchor() + 24, behavior: instant ? 'instant' : 'smooth' })
  }
}
