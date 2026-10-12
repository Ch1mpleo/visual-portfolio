import type { OboxChapterId } from '../../data/oboxChapters'
import { oboxEngineering } from '../../data/oboxEngineering'

/** Product-specific interactions share the existing viewer's lifecycle. */
export class OboxDetailController {
  private film: HTMLVideoElement
  private zoom: HTMLDialogElement
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private viewer: HTMLDialogElement) {
    this.film = viewer.querySelector('[data-obox-film]')!
    this.zoom = viewer.querySelector('[data-obox-zoom]')!
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-engine-chapter]').forEach((button) => {
      button.addEventListener('click', () => this.selectChapter(button.dataset.oboxEngineChapter as OboxChapterId, true))
      button.addEventListener('keydown', (event) => {
        const chapters = Array.from(viewer.querySelectorAll<HTMLButtonElement>('[data-obox-engine-chapter]'))
        const index = chapters.indexOf(button)
        const next = event.key === 'ArrowRight' ? (index + 1) % chapters.length : event.key === 'ArrowLeft' ? (index + chapters.length - 1) % chapters.length : event.key === 'Home' ? 0 : event.key === 'End' ? chapters.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        chapters[next].click()
        chapters[next].focus({ preventScroll: true })
      })
    })
    viewer.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      const select = () => this.selectPart(object.closest<HTMLElement>('[data-obox-engine-panel]')!, object.dataset.storyObject!, true)
      object.addEventListener('click', select)
      object.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); return }
        const panel = object.closest<HTMLElement>('[data-obox-engine-panel]')!
        const objects = Array.from(panel.querySelectorAll<SVGElement>('[data-story-object]'))
        const index = objects.indexOf(object)
        const next = event.key === 'ArrowRight' ? (index + 1) % objects.length : event.key === 'ArrowLeft' ? (index + objects.length - 1) % objects.length : event.key === 'Home' ? 0 : event.key === 'End' ? objects.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        this.selectPart(panel, objects[next].dataset.storyObject!, true)
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
  }

  reset() {
    this.pause()
    this.dismissZoom()
    this.selectChapter('curriculum')
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]').forEach((panel) => {
      this.selectPart(panel, oboxEngineering.find((chapter) => chapter.id === panel.dataset.oboxEnginePanel)!.parts[0].id)
    })
    this.film.currentTime = 0
  }

  play() {
    // A quick tab change can abort loading; native controls remain available if autoplay is blocked.
    void this.film.play().catch(() => {})
  }
  pause() { this.film.pause() }
  dismissZoom() { if (this.zoom.open) this.zoom.close() }

  private reveal(panel: HTMLElement, animate: boolean) {
    panel.getAnimations().forEach((animation) => animation.cancel())
    if (animate && !this.reducedMotion.matches) panel.animate([{ opacity: .25, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)' })
  }

  private selectChapter(id: OboxChapterId, animate = false) {
    if (!oboxEngineering.some((chapter) => chapter.id === id)) return
    this.viewer.querySelectorAll<HTMLButtonElement>('[data-obox-engine-chapter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxEngineChapter === id)))
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.oboxEnginePanel !== id
      if (!panel.hidden) {
        panel.querySelector<HTMLElement>('[data-obox-stage]')!.scrollLeft = 0
        this.reveal(panel, animate)
      }
    })
  }

  private selectPart(panel: HTMLElement, id: string, animate = false) {
    panel.querySelectorAll<HTMLDetailsElement>('details').forEach((detail) => { detail.open = false })
    panel.querySelectorAll<HTMLElement>('[data-obox-part-panel]').forEach((note) => {
      note.hidden = note.dataset.oboxPartPanel !== id
      if (!note.hidden) this.reveal(note, animate)
    })
    panel.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      object.classList.toggle('is-selected', object.dataset.storyObject === id)
      object.setAttribute('aria-pressed', String(object.dataset.storyObject === id))
    })
  }
}
