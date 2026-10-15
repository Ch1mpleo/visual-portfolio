import { oboxEngineering } from '../../data/oboxEngineering'

/** Product-specific interactions share the existing viewer's lifecycle. */
export class OboxDetailController {
  private film: HTMLVideoElement
  private zoom: HTMLDialogElement
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private viewer: HTMLDialogElement) {
    this.film = viewer.querySelector('[data-obox-film]')!
    this.zoom = viewer.querySelector('[data-obox-zoom]')!
    viewer.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      const select = () => this.selectPart(object.closest<HTMLElement>('[data-obox-engine-panel]')!, object.dataset.storyObject!)
      object.addEventListener('click', select)
      object.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); return }
        const panel = object.closest<HTMLElement>('[data-obox-engine-panel]')!
        const objects = Array.from(panel.querySelectorAll<SVGElement>('[data-story-object]'))
        const index = objects.indexOf(object)
        const next = event.key === 'ArrowRight' ? (index + 1) % objects.length : event.key === 'ArrowLeft' ? (index + objects.length - 1) % objects.length : event.key === 'Home' ? 0 : event.key === 'End' ? objects.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        this.selectPart(panel, objects[next].dataset.storyObject!)
        objects[next].focus({ preventScroll: true })
        const stage = panel.querySelector<HTMLElement>('[data-obox-stage]')!
        const rect = objects[next].getBoundingClientRect()
        const frame = stage.getBoundingClientRect()
        stage.scrollTo({ left: stage.scrollLeft + rect.left + rect.width / 2 - frame.left - frame.width / 2, behavior: this.reducedMotion.matches ? 'instant' : 'smooth' })
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
    // Observe the visibility boundary even when the short sheet exposes less
    // than 15% of the film on entry.
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) this.pause() }, { root: viewer.querySelector('[data-viewer-scroller]'), threshold: 0 }).observe(this.film)
  }

  reset() {
    this.pause()
    this.dismissZoom()
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]').forEach((panel) => {
      this.selectPart(panel, oboxEngineering.find((chapter) => chapter.id === panel.dataset.oboxEnginePanel)!.parts[0].id)
    })
    this.film.currentTime = 0
  }

  play() {
    // Opening a short sheet can leave the film below the fold without a new
    // intersection event. Only autoplay when it is visible in the open story.
    const scroller = this.viewer.querySelector<HTMLElement>('[data-viewer-scroller]')!
    const frame = scroller.getBoundingClientRect()
    const film = this.film.getBoundingClientRect()
    if (!this.viewer.open || this.zoom.open || this.reducedMotion.matches ||
      film.height === 0 || film.bottom <= frame.top || film.top >= frame.bottom) return
    // A quick project change can abort loading; native controls remain available if autoplay is blocked.
    void this.film.play().catch(() => {})
  }
  pause() { this.film.pause() }
  dismissZoom() { if (this.zoom.open) this.zoom.close() }

  private selectPart(panel: HTMLElement, id: string) {
    panel.querySelectorAll<HTMLElement>('[data-obox-part-panel]').forEach((note) => {
      note.classList.toggle('is-selected', note.dataset.oboxPartPanel === id)
    })
    panel.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      object.classList.toggle('is-selected', object.dataset.storyObject === id)
      object.setAttribute('aria-pressed', String(object.dataset.storyObject === id))
    })
  }
}
