import { gsap } from 'gsap'
import type { ProjectId } from '../../data/projects'

/** Geometry belongs here; modal state and focus stay in the shared controller. */
export class ProjectViewerMotion {
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private timeline: gsap.core.Timeline | null = null
  private panelTween: gsap.core.Tween | null = null
  private completion: (() => void) | null = null
  private sheet: HTMLElement
  private shell: HTMLElement
  private fadingPanel: HTMLElement | null = null

  constructor(private dialog: HTMLDialogElement) {
    this.sheet = dialog.querySelector('.project-viewer__sheet')!
    this.shell = dialog.querySelector('[data-viewer-transition]')!
    this.reducedMotion.addEventListener('change', () => { if (this.reducedMotion.matches) this.finish() })
    window.addEventListener('resize', () => this.finish())
  }

  open(trigger: HTMLButtonElement, project: ProjectId, done: () => void) {
    this.clear()
    if (this.reducedMotion.matches) { done(); return }
    this.completion = done
    this.timeline = gsap.timeline({ onComplete: () => this.finish() })
    if (matchMedia('(min-width: 768px)').matches) {
      this.showShell(project)
      const from = trigger.getBoundingClientRect()
      const to = this.dialog.getBoundingClientRect()
      gsap.set(this.sheet, { opacity: 0 })
      gsap.set(this.dialog, { transformOrigin: '0 0', x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height })
      this.timeline.to(this.dialog, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.45, ease: 'power3.out' }, 0)
        .to(this.shell, { opacity: 0, duration: 0.16 }, 0.29)
        .to(this.sheet, { opacity: 1, duration: 0.16 }, 0.29)
    } else {
      this.timeline.fromTo(this.dialog, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, ease: 'power2.out' })
    }
  }

  close(trigger: HTMLButtonElement | null, project: ProjectId, done: () => void) {
    this.cancelTimeline()
    this.clearPanel()
    if (this.reducedMotion.matches) { this.clear(); done(); return }
    this.completion = done
    this.timeline = gsap.timeline({ onComplete: () => this.finish() })
    const source = trigger?.getBoundingClientRect()
    if (matchMedia('(min-width: 768px)').matches && source && source.width > 0 && source.bottom > 0 && source.top < innerHeight) {
      this.showShell(project)
      // Measure final layout without discarding a partially completed opening transform.
      const transform = this.dialog.style.transform
      this.dialog.style.transform = 'none'
      const layout = this.dialog.getBoundingClientRect()
      this.dialog.style.transform = transform
      this.timeline.to(this.sheet, { opacity: 0, duration: 0.1 }, 0)
        .to(this.dialog, { x: source.left - layout.left, y: source.top - layout.top, scaleX: source.width / layout.width, scaleY: source.height / layout.height, transformOrigin: '0 0', duration: 0.3, ease: 'power2.inOut' }, 0)
    } else {
      this.timeline.to(this.dialog, { y: 16, opacity: 0, duration: 0.18, ease: 'power2.inOut' })
    }
  }

  fade(panel: HTMLElement) {
    this.clearPanel()
    if (this.reducedMotion.matches) return
    this.fadingPanel = panel
    this.panelTween = gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.18, onComplete: () => this.clearPanel() })
  }

  finish() {
    const done = this.completion
    this.clear()
    done?.()
  }

  clear() {
    this.cancelTimeline()
    this.clearPanel()
    gsap.set([this.dialog, this.sheet, this.shell], { clearProps: 'opacity,transform,transformOrigin' })
    this.shell.hidden = true
  }

  private showShell(project: ProjectId) {
    this.shell.querySelectorAll<HTMLElement>('[data-transition-art]').forEach((art) => { art.hidden = art.dataset.transitionArt !== project })
    this.shell.hidden = false
    gsap.set(this.shell, { opacity: 1 })
  }

  private cancelTimeline() {
    this.timeline?.kill()
    this.timeline = null
    this.completion = null
  }

  private clearPanel() {
    this.panelTween?.kill()
    if (this.fadingPanel) gsap.set(this.fadingPanel, { clearProps: 'opacity' })
    this.fadingPanel = null
    this.panelTween = null
  }
}
