import { projects, type ProjectId, type ProjectTab } from '../../data/projects'
import type { MuseumExhibitId } from '../../data/museumExhibits'
import { oboxAnatomy, type AnatomyId } from '../../data/oboxAnatomy'
import { oboxWorkflows, type WorkflowId, type WorkflowNodeId } from '../../data/oboxWorkflows'
import { OPEN_PROJECT } from './viewerEvents'
import { graphStages, museumLayers, type GraphStageId, type MuseumLayerId } from '../../data/projectInteriors'

type ViewerState = 'closed' | 'opening' | 'open' | 'closing'
const tabs: ProjectTab[] = ['experience', 'under-the-hood']

export class ProjectViewerController {
  private state: ViewerState = 'closed'
  private projectId: ProjectId = 'oboxsteam'
  private activeTab: ProjectTab = 'experience'
  private exhibit: MuseumExhibitId = 'mln131'
  private anatomy: AnatomyId = 'api'
  private workflow: WorkflowId = 'join'
  private workflowStep = 0
  private graphStage: GraphStageId = 'document'
  private museumLayer: MuseumLayerId = 'content'
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
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary, [tabindex="0"]'))
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
    dialog.querySelectorAll<HTMLButtonElement>('[data-anatomy-select]').forEach((button) => {
      button.addEventListener('click', () => this.selectAnatomy(button.dataset.anatomySelect as AnatomyId))
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-workflow-select]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.workflowSelect === this.workflow) return
        this.selectWorkflow(button.dataset.workflowSelect as WorkflowId)
      })
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-workflow-step]').forEach((button) => {
      button.addEventListener('click', () => this.selectWorkflowStep(Number(button.dataset.workflowStep)))
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-step-direction]').forEach((button) => {
      button.addEventListener('click', () => this.selectWorkflowStep(this.workflowStep + Number(button.dataset.stepDirection)))
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-graph-stage]').forEach((button) => {
      button.addEventListener('click', () => this.selectGraphStage(button.dataset.graphStage as GraphStageId))
    })
    dialog.querySelectorAll<HTMLButtonElement>('[data-museum-layer]').forEach((button) => {
      button.addEventListener('click', () => this.selectMuseumLayer(button.dataset.museumLayer as MuseumLayerId))
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
    this.selectAnatomy('api')
    this.selectWorkflow('join')
    this.selectGraphStage('document')
    this.selectMuseumLayer('content')
    this.dialog.querySelectorAll<HTMLDetailsElement>('[data-obox-decision]').forEach((note) => { note.open = false })
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

  private selectAnatomy(id: AnatomyId) {
    const item = oboxAnatomy.find((part) => part.id === id)
    if (!item) return
    this.anatomy = id
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-anatomy-select]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.anatomySelect === this.anatomy))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-anatomy-panel]').forEach((panel) => { panel.hidden = panel.dataset.anatomyPanel !== this.anatomy })
    this.dialog.querySelectorAll<HTMLElement>('[data-anatomy-node]').forEach((node) => {
      node.classList.toggle('is-selected', node.dataset.anatomyNode === this.anatomy)
      node.classList.toggle('is-connected', item.connectionIds.includes(node.dataset.anatomyNode as AnatomyId))
    })
    this.dialog.querySelectorAll<SVGElement>('[data-anatomy-edge]').forEach((edge) => {
      edge.classList.toggle('is-connected', edge.dataset.anatomyEdge!.split(' ').includes(this.anatomy))
    })
  }

  private selectGraphStage(id: GraphStageId) {
    if (!graphStages.some((stage) => stage.id === id)) return
    this.graphStage = id
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-graph-stage]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.graphStage === this.graphStage))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-graph-stage-panel]').forEach((panel) => { panel.hidden = panel.dataset.graphStagePanel !== this.graphStage })
    this.dialog.querySelectorAll<SVGElement>('[data-graph-layer]').forEach((layer) => { layer.classList.toggle('is-selected', layer.dataset.graphLayer === this.graphStage) })
  }

  private selectMuseumLayer(id: MuseumLayerId) {
    if (!museumLayers.some((layer) => layer.id === id)) return
    this.museumLayer = id
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-museum-layer]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.museumLayer === this.museumLayer))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-museum-layer-panel]').forEach((panel) => { panel.hidden = panel.dataset.museumLayerPanel !== this.museumLayer })
    this.dialog.querySelectorAll<SVGElement>('[data-museum-art-layer]').forEach((layer) => {
      const selected = layer.dataset.museumArtLayer === this.museumLayer
      layer.classList.toggle('is-selected', selected)
      if (selected) layer.parentElement!.append(layer)
    })
  }

  private selectWorkflow(id: WorkflowId) {
    if (!oboxWorkflows.some((workflow) => workflow.id === id)) return
    this.workflow = id
    this.workflowStep = 0
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-workflow-select]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.workflowSelect === this.workflow))
    })
    this.dialog.querySelectorAll<HTMLElement>('[data-workflow-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.workflowPanel !== this.workflow
    })
    this.selectWorkflowStep(0)
  }

  private selectWorkflowStep(index: number) {
    const workflow = oboxWorkflows.find((item) => item.id === this.workflow)!
    const panel = this.dialog.querySelector<HTMLElement>(`[data-workflow-panel="${this.workflow}"]`)!
    this.workflowStep = Math.max(0, Math.min(index, workflow.steps.length - 1))
    const step = workflow.steps[this.workflowStep]
    panel.querySelectorAll<HTMLButtonElement>('[data-workflow-step]').forEach((button) => {
      if (Number(button.dataset.workflowStep) === this.workflowStep) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    panel.querySelectorAll<HTMLElement>('[data-workflow-readout]').forEach((readout) => {
      readout.hidden = Number(readout.dataset.workflowReadout) !== this.workflowStep
    })
    panel.querySelectorAll<HTMLElement>('[data-flow-node]').forEach((node) => {
      node.classList.toggle('is-active', step.highlightedNodeIds.includes(node.dataset.flowNode as WorkflowNodeId))
    })
    panel.querySelectorAll<SVGElement>('[data-flow-edge]').forEach((edge) => {
      edge.classList.toggle('is-active', step.highlightedEdgeIds.includes(edge.dataset.flowEdge!))
    })
    panel.querySelectorAll<HTMLButtonElement>('[data-step-direction]').forEach((button) => {
      button.disabled = Number(button.dataset.stepDirection) < 0 ? this.workflowStep === 0 : this.workflowStep === workflow.steps.length - 1
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
