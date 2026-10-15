import { projects, type ProjectId } from '../../data/projects'
import { OPEN_PROJECT } from './viewerEvents'
import { graphStages, type GraphStageId } from '../../data/projectInteriors'
import { ProjectViewerMotion } from './ProjectViewerMotion'
import { OboxDetailController } from './OboxDetailController'

type ViewerState = 'closed' | 'opening' | 'open' | 'closing'

export class ProjectViewerController {
  private state: ViewerState = 'closed'
  private projectId: ProjectId = 'oboxsteam'
  private graphStage: GraphStageId = 'document'
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private trigger: HTMLButtonElement | null = null
  private pagePosition = { x: 0, y: 0 }
  private wasLenisStopped = false
  private backdropPointer: number | null = null
  private scroller: HTMLElement
  private closeButton: HTMLButtonElement
  private panels: HTMLElement[]
  private motion: ProjectViewerMotion
  private obox: OboxDetailController

  constructor(private dialog: HTMLDialogElement) {
    this.motion = new ProjectViewerMotion(dialog)
    this.obox = new OboxDetailController(dialog)
    this.scroller = dialog.querySelector('[data-viewer-scroller]')!
    this.closeButton = dialog.querySelector('[data-viewer-close]')!
    this.panels = Array.from(dialog.querySelectorAll('[data-viewer-project]'))

    document.addEventListener(OPEN_PROJECT, (event) => this.open(event.detail.projectId, event.detail.trigger))
    this.closeButton.addEventListener('click', () => this.close())
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); this.close() })
    dialog.addEventListener('close', () => this.restorePage())
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary, video[controls], [tabindex="0"]'))
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

    dialog.querySelectorAll<SVGElement>('[data-graph-stage]').forEach((button) => {
      button.addEventListener('click', () => this.selectGraphStage(button.dataset.graphStage as GraphStageId, true))
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.selectGraphStage(button.dataset.graphStage as GraphStageId, true); return }
        const stages = Array.from(dialog.querySelectorAll<SVGElement>('[data-graph-stage]'))
        const index = stages.indexOf(button)
        const next = event.key === 'ArrowRight' ? (index + 1) % stages.length : event.key === 'ArrowLeft' ? (index + stages.length - 1) % stages.length : event.key === 'Home' ? 0 : event.key === 'End' ? stages.length - 1 : -1
        if (next < 0) return
        event.preventDefault()
        this.selectGraphStage(stages[next].dataset.graphStage as GraphStageId)
        stages[next].focus({ preventScroll: true })
        const scene = dialog.querySelector<HTMLElement>('[data-graph-scene]')!
        const rect = stages[next].getBoundingClientRect()
        const frame = scene.getBoundingClientRect()
        scene.scrollTo({ left: scene.scrollLeft + rect.left + rect.width / 2 - frame.left - frame.width / 2, behavior: this.reducedMotion.matches ? 'instant' : 'smooth' })
      })
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-graph-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = graphStages.findIndex((stage) => stage.id === this.graphStage)
        const next = (current + Number(button.dataset.graphStep) + graphStages.length) % graphStages.length
        this.selectGraphStage(graphStages[next].id)
      })
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
    this.syncFilm()
    // Native modal autofocus can move the document before focusing the sheet.
    // Keep Lenis and the browser at the position captured from the trigger.
    window.scrollTo(this.pagePosition.x, this.pagePosition.y)
    window.lenis?.scrollTo(this.pagePosition.y, { immediate: true, force: true })
    document.dispatchEvent(new Event('pause-goat-videos'))
    this.closeButton.focus({ preventScroll: true })
    this.motion.open(trigger, projectId, () => { if (this.state === 'opening') this.state = 'open' })
  }

  private close() {
    if (this.state === 'closed' || this.state === 'closing') return
    this.state = 'closing'
    this.obox.pause()
    this.obox.dismissZoom()
    this.motion.close(this.trigger, this.projectId, () => this.dialog.close())
  }

  private restorePage() {
    this.obox.pause()
    this.obox.dismissZoom()
    this.motion.clear()
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
    if (this.state === 'closing') return
    this.motion.finish()
    const index = projects.findIndex((project) => project.id === this.projectId)
    this.projectId = projects[(index + direction + projects.length) % projects.length].id
    this.resetProject()
    this.fadeActivePanel()
  }

  private resetProject() {
    this.obox.reset()
    this.selectGraphStage('document')
    this.dialog.querySelector<HTMLElement>('[data-graph-scene]')!.scrollLeft = 0
    this.render()
  }

  private selectGraphStage(id: GraphStageId, reveal = false) {
    if (!graphStages.some((stage) => stage.id === id)) return
    this.graphStage = id
    this.dialog.querySelectorAll<SVGElement>('[data-graph-stage]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.graphStage === this.graphStage))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-graph-stage-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.graphStagePanel !== this.graphStage
      panel.classList.toggle('is-selected', !panel.hidden)
      if (!panel.hidden && reveal && matchMedia('(max-width: 767px)').matches) {
        panel.scrollIntoView({ block: 'nearest', behavior: this.reducedMotion.matches ? 'instant' : 'smooth' })
        panel.focus({ preventScroll: true })
      }
    })
    this.dialog.querySelectorAll<SVGElement>('[data-graph-layer]').forEach((layer) => { layer.classList.toggle('is-selected', layer.dataset.graphLayer === this.graphStage) })
  }

  private render() {
    const index = projects.findIndex((project) => project.id === this.projectId)
    const project = projects[index]
    this.dialog.querySelector<HTMLElement>('[data-viewer-logo]')!.hidden = project.id !== 'oboxsteam'
    this.dialog.querySelector('[data-viewer-title]')!.textContent = project.title
    this.dialog.querySelector('[data-viewer-category]')!.textContent = `${project.index} / ${project.category}`
    this.dialog.querySelector('[data-viewer-counter]')!.textContent = `${project.index} / 03`
    this.dialog.querySelector('[data-viewer-announcement]')!.textContent = ` — ${project.title}`
    this.dialog.querySelector('[data-viewer-previous]')!.setAttribute('aria-label', `Previous project: ${projects[(index + projects.length - 1) % projects.length].title}`)
    this.dialog.querySelector('[data-viewer-next]')!.setAttribute('aria-label', `Next project: ${projects[(index + 1) % projects.length].title}`)
    this.panels.forEach((panel) => { panel.hidden = panel.dataset.viewerProject !== this.projectId })
    this.scroller.scrollTop = 0
    // Hidden project layout and interrupted fades must not anchor the new document.
    const renderedProject = this.projectId
    requestAnimationFrame(() => {
      if (this.projectId === renderedProject && this.state !== 'closed' && this.state !== 'closing') this.scroller.scrollTop = 0
    })
    this.syncFilm()
  }

  private syncFilm() {
    if (this.dialog.open && this.state !== 'closing' && this.projectId === 'oboxsteam') this.obox.play()
    else this.obox.pause()
  }

  private fadeActivePanel() {
    const panel = this.panels.find((panel) => !panel.hidden)
    if (panel) this.motion.fade(panel)
  }
}
