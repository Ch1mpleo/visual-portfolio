import { projects, type ProjectId, type ProjectTab } from '../../data/projects'
import type { MuseumExhibitId } from '../../data/museumExhibits'
import { OPEN_PROJECT } from './viewerEvents'

type ViewerState = 'closed' | 'opening' | 'open' | 'closing'
const tabs: ProjectTab[] = ['experience', 'under-the-hood']

export class ProjectViewerController {
  private state: ViewerState = 'closed'
  private projectId: ProjectId = 'oboxsteam'
  private activeTab: ProjectTab = 'experience'
  private exhibit: MuseumExhibitId = 'mln131'
  private tabScroll: Record<ProjectTab, number> = { experience: 0, 'under-the-hood': 0 }
  private trigger: HTMLButtonElement | null = null
  private pagePosition = { x: 0, y: 0 }
  private wasLenisStopped = false
  private backdropPointer: number | null = null
  private scroller: HTMLElement
  private closeButton: HTMLButtonElement
  private tabButtons: HTMLButtonElement[]
  private panels: HTMLElement[]

  constructor(private dialog: HTMLDialogElement) {
    this.scroller = dialog.querySelector('[data-viewer-scroller]')!
    this.closeButton = dialog.querySelector('[data-viewer-close]')!
    this.tabButtons = Array.from(dialog.querySelectorAll('[data-project-tab]'))
    this.panels = Array.from(dialog.querySelectorAll('[data-viewer-project]'))

    document.addEventListener(OPEN_PROJECT, (event) => this.open(event.detail.projectId, event.detail.trigger))
    this.closeButton.addEventListener('click', () => this.close())
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); this.close() })
    dialog.addEventListener('close', () => this.restorePage())
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]'))
        .filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus({ preventScroll: true })
      }
    })
    dialog.querySelector('[data-viewer-previous]')!.addEventListener('click', () => this.switchProject(-1))
    dialog.querySelector('[data-viewer-next]')!.addEventListener('click', () => this.switchProject(1))

    this.tabButtons.forEach((button) => {
      button.addEventListener('click', () => this.switchTab(button.dataset.projectTab as ProjectTab))
      button.addEventListener('keydown', (event) => {
        const index = tabs.indexOf(this.activeTab)
        let next: number
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = tabs.length - 1
        else return
        event.preventDefault()
        this.switchTab(tabs[next])
        this.tabButtons[next].focus({ preventScroll: true })
      })
    })

    dialog.querySelectorAll<HTMLButtonElement>('[data-exhibit]').forEach((button) => {
      button.addEventListener('click', () => this.selectExhibit(button.dataset.exhibit as MuseumExhibitId))
    })

    // A drag that begins in the sheet must never dismiss the dialog.
    dialog.addEventListener('pointerdown', (event) => {
      this.backdropPointer = this.isBackdrop(event) ? event.pointerId : null
    })
    dialog.addEventListener('pointerup', (event) => {
      const shouldClose = event.pointerId === this.backdropPointer && this.isBackdrop(event)
      this.backdropPointer = null
      if (shouldClose && matchMedia('(min-width: 768px)').matches) this.close()
    })
    dialog.addEventListener('pointercancel', () => { this.backdropPointer = null })
  }

  private isBackdrop(event: PointerEvent) {
    const rect = this.dialog.getBoundingClientRect()
    return event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
  }

  private open(projectId: ProjectId, trigger: HTMLButtonElement) {
    if (this.state !== 'closed' || !projects.some((project) => project.id === projectId)) return
    if (document.querySelector('.js-vp[aria-hidden="false"]')) return
    this.state = 'opening'
    this.trigger = trigger
    this.pagePosition = { x: window.scrollX, y: window.scrollY }
    this.wasLenisStopped = window.lenis?.isStopped ?? false
    this.projectId = projectId
    this.resetProject()
    window.lenis?.stop()
    document.documentElement.classList.add('is-project-viewer-open')
    this.dialog.showModal()
    // A closed dialog has no layout, so reset its scroller after showModal.
    this.scroller.scrollTop = 0
    // Native modal autofocus can move the document before focusing the sheet.
    // Keep Lenis and the browser at the position captured from the trigger.
    window.scrollTo(this.pagePosition.x, this.pagePosition.y)
    window.lenis?.scrollTo(this.pagePosition.y, { immediate: true, force: true })
    document.dispatchEvent(new Event('pause-goat-videos'))
    this.closeButton.focus({ preventScroll: true })
    this.state = 'open'
  }

  private close() {
    if (this.state === 'closed' || this.state === 'closing') return
    this.state = 'closing'
    this.dialog.close()
  }

  private restorePage() {
    document.documentElement.classList.remove('is-project-viewer-open')
    // Restore the native and smooth-scroll positions before restarting Lenis.
    window.scrollTo(this.pagePosition.x, this.pagePosition.y)
    window.lenis?.scrollTo(this.pagePosition.y, { immediate: true, force: true })
    if (!this.wasLenisStopped) window.lenis?.start()
    document.dispatchEvent(new Event('resume-goat-videos'))
    this.trigger?.focus({ preventScroll: true })
    this.trigger = null
    this.backdropPointer = null
    this.state = 'closed'
  }

  private switchProject(direction: number) {
    const index = projects.findIndex((project) => project.id === this.projectId)
    this.projectId = projects[(index + direction + projects.length) % projects.length].id
    this.resetProject()
  }

  private resetProject() {
    this.activeTab = 'experience'
    this.tabScroll = { experience: 0, 'under-the-hood': 0 }
    this.selectExhibit('mln131')
    this.render()
  }

  private switchTab(tab: ProjectTab) {
    if (tab === this.activeTab) return
    this.tabScroll[this.activeTab] = this.scroller.scrollTop
    this.activeTab = tab
    this.render()
  }

  private selectExhibit(exhibit: MuseumExhibitId) {
    this.exhibit = exhibit
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-exhibit]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.exhibit === this.exhibit))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-exhibit-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.exhibitPanel !== this.exhibit
    })
  }

  private render() {
    const index = projects.findIndex((project) => project.id === this.projectId)
    const project = projects[index]
    this.dialog.querySelector('[data-viewer-title]')!.textContent = project.title
    this.dialog.querySelector('[data-viewer-category]')!.textContent = `${project.index} / ${project.category}`
    this.dialog.querySelector('[data-viewer-counter]')!.textContent = `${project.index} / 03`
    this.dialog.querySelector('[data-viewer-announcement]')!.textContent = ` — ${project.title}`
    this.dialog.querySelector('[data-viewer-previous]')!.setAttribute('aria-label', `Previous project: ${projects[(index + projects.length - 1) % projects.length].title}`)
    this.dialog.querySelector('[data-viewer-next]')!.setAttribute('aria-label', `Next project: ${projects[(index + 1) % projects.length].title}`)
    this.tabButtons.forEach((button) => {
      const selected = button.dataset.projectTab === this.activeTab
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
      button.setAttribute('aria-controls', `viewer-${this.projectId}-${button.dataset.projectTab}`)
    })
    this.panels.forEach((panel) => {
      panel.hidden = panel.dataset.viewerProject !== this.projectId || panel.dataset.viewerTab !== this.activeTab
    })
    this.scroller.scrollTop = this.tabScroll[this.activeTab]
  }
}
