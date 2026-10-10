import { gsap } from 'gsap'
import type { ProjectId } from '../../data/projects'

/** A printed cover sweeps away to reveal the inspection sheet, without scaling text. */
export class ProjectViewerMotion {
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  private timeline: gsap.core.Timeline | null = null
  private panelTween: gsap.core.Tween | null = null
  private completion: (() => void) | null = null
  private sheet: HTMLElement
  private shell: HTMLElement
  private parts: HTMLElement[]
  private titles: HTMLElement[]
  private fadingPanel: HTMLElement | null = null

  constructor(private dialog: HTMLDialogElement) {
    this.sheet = dialog.querySelector('.project-viewer__sheet')!
    this.shell = dialog.querySelector('[data-viewer-transition]')!
    this.parts = Array.from(this.sheet.querySelectorAll<HTMLElement>('.project-viewer__header, .project-viewer__tabs, .project-viewer__scroller, .project-viewer__footer'))
    this.titles = Array.from(this.shell.querySelectorAll<HTMLElement>('[data-cover-title]'))
    this.reducedMotion.addEventListener('change', () => { if (this.reducedMotion.matches) this.finish() })
    window.addEventListener('resize', () => this.finish())
  }

  open(_trigger: HTMLButtonElement, project: ProjectId, done: () => void) {
    this.clear()
    if (this.reducedMotion.matches) { done(); return }
    this.completion = done
    const compact = matchMedia('(max-width: 767px)').matches
    this.showCover(project)
    gsap.set(this.dialog, { clipPath: 'inset(0% 0% 0% 100%)', '--viewer-backdrop': 0 })
    gsap.set(this.shell, { xPercent: 0 })
    gsap.set(this.titles, { yPercent: 110 })
    gsap.set(this.parts, { x: compact ? 24 : 48, opacity: 0 })
    this.timeline = gsap.timeline({ onComplete: () => this.finish() })
      .to(this.dialog, { clipPath: 'inset(0% 0% 0% 0%)', duration: compact ? 0.3 : 0.38, ease: 'expo.inOut' }, 0)
      .to(this.dialog, { '--viewer-backdrop': 1, duration: 0.4, ease: 'power2.out' }, 0)
      .to(this.titles, { yPercent: 0, duration: 0.5, ease: 'power3.out' }, 0.06)
      .to(this.shell, { xPercent: -101, duration: compact ? 0.5 : 0.62, ease: 'expo.inOut' }, 0.12)
      .to(this.parts, { x: 0, opacity: 1, duration: 0.46, stagger: 0.03, ease: 'power3.out' }, compact ? 0.26 : 0.34)
  }

  close(_trigger: HTMLButtonElement | null, project: ProjectId, done: () => void) {
    this.cancelTimeline()
    this.clearPanel()
    if (this.reducedMotion.matches) { this.clear(); done(); return }
    this.completion = done
    // Preserve a partially revealed cover when Escape interrupts opening.
    const interrupted = !this.shell.hidden
    this.showCover(project)
    if (!interrupted) {
      gsap.set(this.shell, { xPercent: -101 })
      gsap.set(this.titles, { yPercent: 0 })
    }
    this.timeline = gsap.timeline({ onComplete: () => this.finish() })
      .to(this.shell, { xPercent: 0, duration: 0.45, ease: 'expo.inOut' }, 0)
      .to(this.parts, { x: -24, opacity: 0, duration: 0.24, stagger: 0.02, ease: 'power2.in' }, 0.08)
      .to(this.dialog, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.38, ease: 'expo.inOut' }, 0.3)
      .to(this.dialog, { '--viewer-backdrop': 0, duration: 0.3, ease: 'power2.inOut' }, 0.35)
  }

  fade(panel: HTMLElement) {
    this.clearPanel()
    if (this.reducedMotion.matches) return
    this.fadingPanel = panel
    this.panelTween = gsap.fromTo(panel, { x: 18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, ease: 'power3.out', onComplete: () => this.clearPanel() })
  }

  finish() {
    const done = this.completion
    this.clear()
    done?.()
  }

  clear() {
    this.cancelTimeline()
    this.clearPanel()
    gsap.set([this.dialog, this.sheet, this.shell, ...this.parts, ...this.titles], { clearProps: 'opacity,transform,transformOrigin,clipPath,--viewer-backdrop' })
    this.shell.hidden = true
  }

  private showCover(project: ProjectId) {
    this.shell.querySelectorAll<HTMLElement>('[data-transition-art]').forEach((cover) => { cover.hidden = cover.dataset.transitionArt !== project })
    this.shell.hidden = false
  }

  private cancelTimeline() {
    this.timeline?.kill()
    this.timeline = null
    this.completion = null
  }

  private clearPanel() {
    this.panelTween?.kill()
    if (this.fadingPanel) gsap.set(this.fadingPanel, { clearProps: 'opacity,transform' })
    this.fadingPanel = null
    this.panelTween = null
  }
}
