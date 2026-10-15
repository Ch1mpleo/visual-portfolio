import { oboxEngineering } from '../../data/oboxEngineering'

const SCREEN_BEAT = 'screen'

/** Product-specific interactions share the existing viewer's lifecycle. */
export class OboxDetailController {
  private film: HTMLVideoElement
  private zoom: HTMLDialogElement
  private scroller: HTMLElement
  private panels: HTMLElement[]
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private phone = matchMedia('(max-width: 767px)')
  private frame = 0
  private lockedUntil = 0

  constructor(private viewer: HTMLDialogElement) {
    this.film = viewer.querySelector('[data-obox-film]')!
    this.zoom = viewer.querySelector('[data-obox-zoom]')!
    this.scroller = viewer.querySelector('[data-viewer-scroller]')!
    this.panels = Array.from(viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]'))
    viewer.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      const panel = () => object.closest<HTMLElement>('[data-obox-engine-panel]')!
      object.addEventListener('click', () => this.reveal(panel(), object.dataset.storyObject!))
      object.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.reveal(panel(), object.dataset.storyObject!); return }
        const objects = Array.from(panel().querySelectorAll<SVGElement>('[data-story-object]'))
        const index = objects.indexOf(object)
        const next = event.key === 'ArrowRight' ? (index + 1) % objects.length : event.key === 'ArrowLeft' ? (index + objects.length - 1) % objects.length : event.key === 'Home' ? 0 : event.key === 'End' ? objects.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        this.reveal(panel(), objects[next].dataset.storyObject!)
        objects[next].focus({ preventScroll: true })
      })
    })
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-enlarge]').forEach((button) => {
      button.addEventListener('click', () => {
        const image = this.zoom.querySelector<HTMLImageElement>('[data-obox-zoom-image]')!
        image.src = button.dataset.image!
        image.alt = button.dataset.caption!
        this.pause()
        this.zoom.showModal()
        this.zoom.querySelector<HTMLElement>('.obox-zoom__scroll')!.scrollTo(0, 0)
      })
    })
    this.zoom.querySelector('[data-obox-zoom-close]')!.addEventListener('click', () => this.zoom.close())
    this.zoom.addEventListener('cancel', (event) => { event.preventDefault(); event.stopPropagation(); this.zoom.close() })
    // The inner native modal owns its focus cycle and Escape key.
    this.zoom.addEventListener('keydown', (event) => event.stopPropagation())
    this.zoom.addEventListener('close', (event) => event.stopPropagation())
    this.reducedMotion.addEventListener('change', () => { if (this.reducedMotion.matches) this.pause() })
    this.scroller.addEventListener('scroll', () => this.schedule(), { passive: true })
    // Observe the visibility boundary even when the short sheet exposes less
    // than 15% of the film on entry.
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) this.pause() }, { root: this.scroller, threshold: 0 }).observe(this.film)
  }

  reset() {
    this.pause()
    this.dismissZoom()
    this.lockedUntil = 0
    this.panels.forEach((panel) => {
      this.selectPart(panel, oboxEngineering.find((chapter) => chapter.id === panel.dataset.oboxEnginePanel)!.parts[0].id)
    })
    this.film.currentTime = 0
  }

  play() {
    // Opening a short sheet can leave the film below the fold without a new
    // intersection event. Only autoplay when it is visible in the open story.
    const frame = this.scroller.getBoundingClientRect()
    const film = this.film.getBoundingClientRect()
    if (!this.viewer.open || this.zoom.open || this.reducedMotion.matches ||
      film.height === 0 || film.bottom <= frame.top || film.top >= frame.bottom) return
    // A quick project change can abort loading; native controls remain available if autoplay is blocked.
    void this.film.play().catch(() => {})
  }
  pause() { this.film.pause() }
  dismissZoom() { if (this.zoom.open) this.zoom.close() }

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
    for (const panel of this.panels) {
      const beats = Array.from(panel.querySelectorAll<HTMLElement>('[data-obox-part-panel]'))
      let active = beats[0]
      for (const beat of beats) if (beat.getBoundingClientRect().top <= anchor) active = beat
      if (active) this.selectPart(panel, active.dataset.oboxPartPanel!)
    }
  }

  private reveal(panel: HTMLElement, id: string) {
    const beat = panel.querySelector<HTMLElement>(`[data-obox-part-panel="${id}"]`)
    if (!beat) return
    this.selectPart(panel, id)
    const instant = this.reducedMotion.matches
    this.lockedUntil = instant ? 0 : Date.now() + 900
    this.scroller.scrollTo({ top: this.scroller.scrollTop + beat.getBoundingClientRect().top - this.anchor() + 24, behavior: instant ? 'instant' : 'smooth' })
  }

  private selectPart(panel: HTMLElement, id: string) {
    if (panel.dataset.activeBeat === id) return
    panel.dataset.activeBeat = id
    panel.querySelectorAll<HTMLElement>('[data-obox-part-panel]').forEach((note) => {
      note.classList.toggle('is-selected', note.dataset.oboxPartPanel === id)
    })
    const objects = Array.from(panel.querySelectorAll<SVGElement>('[data-story-object]'))
    objects.forEach((object) => {
      object.classList.toggle('is-selected', object.dataset.storyObject === id)
      object.setAttribute('aria-pressed', String(object.dataset.storyObject === id))
    })
    const stage = panel.querySelector<HTMLElement>('[data-obox-stage]')
    if (!stage) return
    const screen = id === SCREEN_BEAT
    const index = objects.findIndex((object) => object.dataset.storyObject === id)
    stage.dataset.view = screen ? 'screen' : 'art'
    if (index >= 0) stage.style.setProperty('--focus', String(index))
    stage.querySelector('.obox-engine__art')?.toggleAttribute('inert', screen)
    const enlarge = stage.querySelector<HTMLButtonElement>('[data-obox-enlarge]')
    if (enlarge) enlarge.tabIndex = screen ? 0 : -1
  }
}
