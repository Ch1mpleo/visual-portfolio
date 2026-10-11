import { oboxChapters, type OboxChapterId } from '../../data/oboxChapters'
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
      button.addEventListener('click', () => this.selectJourney(button.dataset.oboxEngineChapter as OboxChapterId, 'engineering', true))
    })
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-part]').forEach((button) => {
      button.addEventListener('click', () => this.selectPart(button.closest<HTMLElement>('[data-obox-engine-panel]')!, button.dataset.oboxPart!, true))
    })
    viewer.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      const select = () => this.selectPart(object.closest<HTMLElement>('[data-obox-engine-panel]')!, object.dataset.storyObject!, true)
      object.addEventListener('click', select)
      object.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } })
    })
    viewer.querySelectorAll<HTMLButtonElement>('[data-obox-chapter]').forEach((button) => {
      button.addEventListener('click', () => this.selectJourney(button.dataset.oboxChapter as OboxChapterId, 'experience', true))
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
    this.selectJourney('curriculum')
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]').forEach((panel) => {
      this.selectPart(panel, oboxEngineering.find((chapter) => chapter.id === panel.dataset.oboxEnginePanel)!.parts[0].id)
    })
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-screen]').forEach((screen) => {
      screen.dataset.focus = 'full'
      screen.querySelectorAll<HTMLButtonElement>('[data-obox-focus]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxFocus === 'full')))
    })
    this.film.currentTime = 0
  }

  pause() { this.film.pause() }
  dismissZoom() { if (this.zoom.open) this.zoom.close() }

  private selectJourney(id: OboxChapterId, source: 'experience' | 'engineering' = 'experience', animate = false) {
    // Both views follow the same chapter; inspecting implementation keeps context.
    this.selectChapter(id, animate && source === 'experience')
    this.selectEngineeringChapter(id, animate && source === 'engineering')
  }

  private reveal(panel: HTMLElement, animate: boolean) {
    panel.getAnimations().forEach((animation) => animation.cancel())
    if (animate && !this.reducedMotion.matches) panel.animate([{ opacity: .25, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)' })
  }

  private selectEngineeringChapter(id: OboxChapterId, animate = false) {
    if (!oboxEngineering.some((chapter) => chapter.id === id)) return
    this.viewer.querySelectorAll<HTMLButtonElement>('[data-obox-engine-chapter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxEngineChapter === id)))
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-engine-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.oboxEnginePanel !== id
      if (!panel.hidden) this.reveal(panel, animate)
    })
  }

  private selectPart(panel: HTMLElement, id: string, animate = false) {
    panel.querySelectorAll<HTMLButtonElement>('[data-obox-part]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxPart === id)))
    panel.querySelectorAll<HTMLElement>('[data-obox-part-panel]').forEach((note) => {
      note.hidden = note.dataset.oboxPartPanel !== id
      if (!note.hidden) this.reveal(note, animate)
    })
    panel.querySelectorAll<SVGElement>('[data-story-object]').forEach((object) => {
      object.classList.toggle('is-selected', object.dataset.storyObject === id)
      object.setAttribute('aria-pressed', String(object.dataset.storyObject === id))
    })
  }

  private selectChapter(id: OboxChapterId, animate = false) {
    if (!oboxChapters.some((chapter) => chapter.id === id)) return
    this.viewer.querySelectorAll<HTMLButtonElement>('[data-obox-chapter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.oboxChapter === id)))
    this.viewer.querySelectorAll<HTMLElement>('[data-obox-chapter-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.oboxChapterPanel !== id
      if (!panel.hidden) this.reveal(panel, animate)
    })
  }
}
