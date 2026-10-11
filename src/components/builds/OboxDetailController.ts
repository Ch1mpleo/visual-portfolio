import { oboxChapters, type OboxChapterId } from '../../data/oboxChapters'

/** Product-specific interactions share the existing viewer's lifecycle. */
export class OboxDetailController {
  private film: HTMLVideoElement
  private zoom: HTMLDialogElement
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private viewer: HTMLDialogElement) {
    this.film = viewer.querySelector('[data-obox-film]')!
    this.zoom = viewer.querySelector('[data-obox-zoom]')!
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-chapter]').forEach((button) => {
      button.addEventListener('click', () => this.selectChapter(button.dataset.oboxChapter as OboxChapterId, true))
    })
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-focus]').forEach((button) => {
      button.addEventListener('click', () => {
        const screen = button.closest<HTMLElement>('[data-obox-screen]')!
        screen.dataset.focus = button.dataset.oboxFocus
        screen.querySelectorAll<HTMLButtonElement>('[data-obox-focus]').forEach((control) => control.setAttribute('aria-pressed', String(control === button)))
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
  }

  reset() {
    this.pause()
    this.dismissZoom()
    this.selectChapter('curriculum')
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-screen]').forEach((screen) => {
      screen.dataset.focus = 'full'
      screen.querySelectorAll<HTMLButtonElement>('[data-obox-focus]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxFocus === 'full')))
    })
    this.film.currentTime = 0
  }

  pause() { this.film.pause() }
  dismissZoom() { if (this.zoom.open) this.zoom.close() }

  private selectChapter(id: OboxChapterId, animate = false) {
    if (!oboxChapters.some((chapter) => chapter.id === id)) return
    this.viewer.querySelectorAll<HTMLButtonElement>('[data-obox-chapter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxChapter === id)))
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-chapter-panel]').forEach((panel) => {
      panel.getAnimations().forEach((animation) => animation.cancel())
      panel.hidden = panel.dataset.oboxChapterPanel !== id
      if (!panel.hidden && animate && !this.reducedMotion.matches) panel.animate([{ opacity: .25, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)' })
    })
  }
}
