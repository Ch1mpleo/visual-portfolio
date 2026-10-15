/** OboxSTEAM's film and screenshot zoom share the existing viewer's lifecycle. */
export class OboxDetailController {
  private film: HTMLVideoElement
  private zoom: HTMLDialogElement
  private scroller: HTMLElement
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private viewer: HTMLDialogElement) {
    this.film = viewer.querySelector('[data-obox-film]')!
    this.zoom = viewer.querySelector('[data-obox-zoom]')!
    this.scroller = viewer.querySelector('[data-viewer-scroller]')!
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
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) this.pause() }, { root: this.scroller, threshold: 0 }).observe(this.film)
  }

  reset() {
    this.pause()
    this.dismissZoom()
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
}
