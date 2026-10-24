import { bubblePosition, connectionPath, networkBounds, type Point } from './model'

type Track = { el: SVGGElement; path: SVGPathElement; contact: SVGCircleElement; length: number }
export class InfrastructureController {
  private buttons: HTMLButtonElement[]
  private parts: SVGGElement[]
  private edges: Track[]
  private panels: HTMLElement[]
  private viewport: HTMLElement
  private world: HTMLElement
  private space: HTMLElement
  private bubble: HTMLElement
  private scroller: HTMLElement
  private original: Map<string, Point>
  private positions = new Map<string, Point>()
  private inspected: string | null = null
  private pinned = false
  private restoring = false
  private openTimer = 0
  private closeTimer = 0
  private visible = false
  private playing = false
  private completed = false
  private frame = 0
  private clock = 0
  private last = 0
  private lastStep = -1
  private reduced = matchMedia('(prefers-reduced-motion: reduce)')

  constructor(private root: HTMLElement) {
    this.buttons = Array.from(root.querySelectorAll('[data-arch-select]'))
    this.parts = Array.from(root.querySelectorAll('[data-infra-part]'))
    this.panels = Array.from(root.querySelectorAll('[data-arch-panel]'))
    this.viewport = root.querySelector('[data-infra-viewport]')!
    this.world = root.querySelector('[data-infra-world]')!
    this.space = root.querySelector('[data-infra-space]')!
    this.bubble = root.querySelector('[data-infra-bubble]')!
    this.scroller = root.closest('[data-viewer-scroller]') ?? document.documentElement
    this.original = new Map(this.buttons.map(button => [button.dataset.archSelect!, [Number(button.dataset.x), Number(button.dataset.y)]]))
    this.edges = Array.from(root.querySelectorAll<SVGGElement>('[data-infra-edge]')).map(el => ({ el, path: el.querySelector('.infra-track')!, contact: el.querySelector('.infra-contact')!, length: 0 }))
    this.buttons.forEach(button => {
      const id = button.dataset.archSelect!
      button.addEventListener('pointerenter', event => {
        this.part(id)?.classList.add('is-hovered')
        clearTimeout(this.closeTimer)
        if (event.pointerType !== 'touch' && this.root.dataset.layout !== 'stacked' && !this.pinned && !this.keyboardFocused()) {
          clearTimeout(this.openTimer)
          this.openTimer = window.setTimeout(() => this.inspect(id, false), 180)
        }
      })
      button.addEventListener('pointerleave', () => {
        clearTimeout(this.openTimer)
        this.part(id)?.classList.remove('is-hovered')
        if (!this.pinned) this.scheduleClose()
      })
      button.addEventListener('focus', () => { if (!this.restoring && !this.pinned && button.matches(':focus-visible')) this.inspect(id, false) })
      button.addEventListener('blur', () => { if (!this.pinned) this.scheduleClose() })
      button.addEventListener('click', () => this.inspect(id, true))
      button.addEventListener('keydown', event => this.navigate(event, button))
    })
    this.bubble.addEventListener('pointerenter', () => clearTimeout(this.closeTimer))
    this.bubble.addEventListener('pointerleave', () => { if (!this.pinned) this.scheduleClose() })
    this.bubble.addEventListener('focusin', () => clearTimeout(this.closeTimer))
    this.bubble.addEventListener('focusout', event => {
      if (!this.pinned && !this.bubble.contains(event.relatedTarget as Node)) this.scheduleClose()
    })
    root.querySelector('[data-infra-close]')!.addEventListener('click', () => this.close(true))
    const pinButton = root.querySelector<HTMLButtonElement>('[data-infra-pin]')!
    pinButton.addEventListener('click', () => {
      if (!this.inspected) return
      this.inspect(this.inspected, !this.pinned)
    })
    pinButton.addEventListener('animationend', event => {
      if (event.animationName === 'infra-pin-press') pinButton.classList.remove('is-pinning')
    })
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.inspected) { event.preventDefault(); event.stopPropagation(); this.close(true) }
    })
    root.addEventListener('pointerdown', event => {
      if (!(event.target as Element).closest('[data-arch-select], [data-infra-bubble]')) this.close()
    })
    root.querySelector('[data-infra-play]')!.addEventListener('click', () => {
      this.playing = !this.playing
      this.clock = 0; this.lastStep = -1
      this.close()
      this.stop()
      this.highlight()
      this.updatePlayback()
      this.run()
    })
    this.scroller.addEventListener('scroll', () => this.positionBubble(), { passive: true })
    const dialog = root.closest('dialog')
    if (dialog) {
      const project = root.closest('[data-viewer-project]')!
      const observer = new MutationObserver(() => {
        if (project.hasAttribute('hidden') || !dialog.open) {
          this.playing = false; this.close(); this.stop(); this.updatePlayback()
        }
      })
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] })
      observer.observe(project, { attributes: true, attributeFilter: ['hidden'] })
    }
    this.reduced.addEventListener('change', () => { pinButton.classList.remove('is-pinning'); this.playing = false; this.stop(); this.highlight(); this.updatePlayback() })
    document.addEventListener('visibilitychange', () => { this.stop(); this.run() })
    new IntersectionObserver(entries => {
      this.visible = entries[entries.length - 1].isIntersecting
      if (this.visible) this.run(); else { this.close(); this.stop() }
    }, { threshold: .05 }).observe(this.viewport)
    new ResizeObserver(() => this.layout()).observe(this.viewport)
    this.updatePlayback()
  }

  private part(id: string) { return this.parts.find(part => part.dataset.infraPart === id) }
  private layout() {
    const available = this.viewport.clientWidth
    if (!available) return
    this.stop()
    const stacked = available < 900
    const network = this.root.querySelector<HTMLElement>('[data-infra-network]')
    const members = network?.dataset.members!.split(',') ?? []
    const memberIndexes = this.buttons.flatMap((button, index) => members.includes(button.dataset.archSelect!) ? [index] : [])
    const firstMember = Math.min(...memberIndexes), lastMember = Math.max(...memberIndexes)
    this.root.dataset.layout = stacked ? 'stacked' : 'wide'
    const width = stacked ? available : Number(this.root.dataset.worldWidth)
    const height = stacked ? this.buttons.length * 180 + 40 + (network ? 152 : 0) : Number(this.root.dataset.worldHeight)
    const scale = stacked ? 1 : available / width
    const svg = this.world.querySelector('svg')!
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height))
    this.world.style.width = `${width}px`; this.world.style.height = `${height}px`
    this.world.style.transform = `scale(${scale})`
    this.space.style.width = `${width * scale}px`; this.space.style.height = `${height * scale}px`
    this.buttons.forEach((button, index) => {
      const id = button.dataset.archSelect!
      const networkGap = network ? (index >= firstMember ? 72 : 0) + (index > lastMember ? 80 : 0) : 0
      const point: Point = stacked ? [Math.max(90, width * .28), 130 + index * 180 + networkGap] : this.original.get(id)!
      this.positions.set(id, point)
      button.dataset.x = String(point[0]); button.dataset.y = String(point[1])
      button.style.left = stacked ? '0' : `${point[0]}px`
      button.style.top = `${point[1] - 112}px`
      this.part(id)!.setAttribute('transform', `translate(${point[0]} ${point[1]})`)
      this.part(id)!.querySelector('.infra-device__body')!.setAttribute('transform', `scale(${stacked ? .92 : 1.25})`)
    })
    if (network) {
      const bounds = networkBounds({ name: '', note: '', nodeIds: members }, this.positions, width, stacked)
      for (const [property, value] of Object.entries(bounds)) network.style.setProperty(property, `${value}px`)
    }
    this.edges.forEach((edge, index) => {
      const from = edge.el.dataset.from!, to = edge.el.dataset.to!
      edge.path.setAttribute('d', connectionPath(this.positions.get(from)!, this.positions.get(to)!, stacked, index, this.buttons.find(button => button.dataset.archSelect === from)!.dataset.kind === 'clients'))
      edge.length = edge.path.getTotalLength()
    })
    this.positionBubble(); this.run()
  }
  private navigate(event: KeyboardEvent, button: HTMLButtonElement) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let target: HTMLButtonElement | undefined
    if (event.key === 'Home') target = this.buttons[0]
    else if (event.key === 'End') target = this.buttons.at(-1)
    else {
      const [dx, dy] = event.key === 'ArrowRight' ? [1, 0] : event.key === 'ArrowLeft' ? [-1, 0] : event.key === 'ArrowDown' ? [0, 1] : [0, -1]
      const x = Number(button.dataset.x), y = Number(button.dataset.y)
      target = this.buttons.filter(item => item !== button).map(item => {
        const ax = Number(item.dataset.x) - x, ay = Number(item.dataset.y) - y
        return { item, ahead: ax * dx + ay * dy, score: Math.hypot(ax, ay) + Math.abs(ax * dy - ay * dx) * 2 }
      }).filter(item => item.ahead > 10).sort((a, b) => a.score - b.score)[0]?.item
    }
    if (!target) return
    this.close()
    target.focus({ preventScroll: true })
    const box = target.getBoundingClientRect(), scroll = this.scroller.getBoundingClientRect()
    if (box.top < scroll.top + 16) this.scroller.scrollTop += box.top - scroll.top - 16
    else if (box.bottom > scroll.bottom - 16) this.scroller.scrollTop += box.bottom - scroll.bottom + 16
    this.inspect(target.dataset.archSelect!, false)
  }
  private inspect(id: string, pin: boolean) {
    clearTimeout(this.openTimer); clearTimeout(this.closeTimer)
    const changed = this.inspected !== id || this.bubble.hidden
    this.inspected = id; this.pinned = pin; this.bubble.hidden = false
    this.bubble.dataset.pinned = String(pin)
    this.bubble.setAttribute('aria-labelledby', `${this.panels.find(panel => panel.dataset.archPanel === id)!.id}-title`)
    const index = this.buttons.findIndex(button => button.dataset.archSelect === id)
    const pinButton = this.root.querySelector<HTMLButtonElement>('[data-infra-pin]')!
    pinButton.classList.remove('is-pinning')
    pinButton.setAttribute('aria-pressed', String(pin))
    pinButton.setAttribute('aria-label', pin ? 'Unpin inspection' : 'Pin inspection')
    pinButton.querySelector('[data-infra-pin-label]')!.textContent = pin ? 'Pinned' : 'Pin'
    this.panels.forEach(panel => { panel.hidden = panel.dataset.archPanel !== id })
    this.buttons.forEach(button => {
      button.setAttribute('aria-expanded', String(button.dataset.archSelect === id))
      button.setAttribute('aria-pressed', String(button.dataset.archSelect === id && pin))
    })
    if (changed) {
      this.bubble.querySelector('.infra-bubble__content')!.scrollTop = 0
      if (this.root.dataset.layout === 'stacked') {
        // Seat the selected row below its speech bubble, keeping both in view.
        const anchor = this.buttons[index].getBoundingClientRect(), scroll = this.scroller.getBoundingClientRect()
        this.scroller.scrollTop += anchor.bottom - scroll.bottom + 16
      }
      if (!this.reduced.matches) {
        this.bubble.getAnimations().forEach(animation => animation.cancel())
        this.bubble.animate([{ opacity: 0, transform: 'translateY(8px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' })
      }
    }
    this.stop(); this.highlight(id); this.positionBubble()
    if (pin && !this.reduced.matches) {
      // Both anatomy clicks and the pin toggle use the same replayable press.
      void pinButton.offsetWidth
      pinButton.classList.add('is-pinning')
    }
    if (pin) this.root.querySelector('[data-infra-announcement]')!.textContent = `${this.buttons.find(button => button.dataset.archSelect === id)!.innerText.replace(/\s+/g, ' ')}. Inspection open.`
  }
  private scheduleClose() {
    clearTimeout(this.closeTimer)
    this.closeTimer = window.setTimeout(() => {
      if (this.buttons.some(button => button.matches(':hover')) || this.bubble.contains(document.activeElement) || (this.keyboardFocused() && (document.activeElement as HTMLElement).dataset.archSelect === this.inspected)) return
      this.close()
    }, 300)
  }
  private close(restore = false) {
    clearTimeout(this.openTimer); clearTimeout(this.closeTimer)
    const id = this.inspected
    this.inspected = null; this.pinned = false; this.bubble.hidden = true
    this.root.querySelector('[data-infra-pin]')!.classList.remove('is-pinning')
    this.bubble.getAnimations().forEach(animation => animation.cancel())
    this.buttons.forEach(button => { button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-pressed', 'false') })
    this.highlight()
    if (restore && id) {
      this.restoring = true
      this.buttons.find(button => button.dataset.archSelect === id)!.focus({ preventScroll: true })
      this.restoring = false
    }
    this.run()
  }
  private positionBubble() {
    if (!this.inspected) return
    const button = this.buttons.find(button => button.dataset.archSelect === this.inspected)!
    const anchor = this.root.dataset.layout === 'stacked' ? button.getBoundingClientRect() : this.part(this.inspected)!.getBoundingClientRect()
    const plot = this.viewport.getBoundingClientRect(), scroll = this.scroller.getBoundingClientRect()
    const left = Math.max(plot.left, scroll.left), right = Math.min(plot.right, scroll.right)
    const top = Math.max(0, scroll.top), bottom = Math.min(window.innerHeight, scroll.bottom)
    if (anchor.bottom < top || anchor.top > bottom || plot.bottom < top || plot.top > bottom || bottom - top < 160) { this.bubble.style.visibility = 'hidden'; return }
    this.bubble.style.visibility = 'visible'
    this.bubble.style.width = `${Math.min(348, right - left - 24)}px`
    const availableHeight = this.root.dataset.layout === 'stacked'
      ? Math.max(160, Math.max(anchor.top - top, bottom - anchor.bottom) - 34)
      : bottom - top - 24
    this.bubble.style.maxHeight = `${availableHeight}px`
    const pos = bubblePosition({ x: anchor.left - left, y: anchor.top - top, w: anchor.width, h: anchor.height }, { w: right - left, h: bottom - top }, { w: this.bubble.offsetWidth, h: this.bubble.offsetHeight })
    this.bubble.dataset.tail = pos.detached ? 'none' : pos.side
    this.bubble.style.setProperty('--tail-offset', `${pos.tail}px`)
    this.bubble.style.transformOrigin = pos.side === 'top' || pos.side === 'bottom' ? `${pos.tail}px ${pos.side === 'top' ? '0%' : '100%'}` : `${pos.side === 'left' ? '0%' : '100%'} ${pos.tail}px`
    this.bubble.style.left = `${left + pos.x}px`; this.bubble.style.top = `${top + pos.y}px`
  }
  private highlight(id?: string) {
    this.root.classList.toggle('is-inspecting', Boolean(id))
    this.edges.forEach(({ el }) => el.classList.toggle('is-active', id ? el.dataset.from === id || el.dataset.to === id : this.playing && this.reduced.matches))
    this.parts.forEach(part => part.classList.toggle('is-selected', part.dataset.infraPart === id))
    this.root.querySelector('[data-infra-readout]')!.textContent = id ? this.buttons.find(button => button.dataset.archSelect === id)!.querySelector('.infra-node__label')!.textContent!.replace('+', '').trim() : this.playing && this.reduced.matches ? 'Core flow highlighted.' : 'Core parts, connected.'
  }
  private updatePlayback() {
    const control = this.root.querySelector<HTMLButtonElement>('[data-infra-play]')!
    control.setAttribute('aria-pressed', String(this.playing))
    this.root.querySelector('[data-play-icon]')!.textContent = this.playing ? 'Ⅱ' : '↗'
    this.root.querySelector('[data-play-label]')!.textContent = this.reduced.matches ? this.playing ? 'Hide flow' : 'Show flow' : this.playing ? 'Pause flow' : this.completed ? 'Replay flow' : 'Trace flow'
  }
  private stop() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; this.lastStep = -1
    this.edges.forEach(({ el, contact }) => { contact.setAttribute('opacity', '0'); el.classList.remove('is-tracing') })
    this.parts.forEach(part => part.classList.remove('is-tracing'))
  }
  private run() {
    if (!this.frame && this.visible && this.playing && !this.inspected && !this.root.closest('[hidden]') && !this.reduced.matches && !document.hidden) this.frame = requestAnimationFrame(this.tick)
  }
  private keyboardFocused() { return this.buttons.some(button => button === document.activeElement && button.matches(':focus-visible')) }
  private tick = (now: number) => {
    this.clock += this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 0
    this.last = now
    const step = Math.floor(this.clock / 2)
    if (step >= this.edges.length) {
      this.playing = false; this.completed = true; this.stop(); this.highlight(); this.updatePlayback()
      this.root.querySelector('[data-infra-readout]')!.textContent = 'Flow complete. Explore any part.'
      return
    }
    const phase = this.clock % 2 / 2, eased = phase * phase * (3 - 2 * phase)
    this.edges.forEach(({ el, path, contact, length }, index) => {
      const active = index === step
      el.classList.toggle('is-tracing', active)
      if (active) {
        const point = path.getPointAtLength(length * eased)
        contact.setAttribute('transform', `translate(${point.x} ${point.y})`)
      }
      contact.setAttribute('opacity', active ? String(Math.sin(Math.PI * phase) ** 2) : '0')
    })
    if (step !== this.lastStep) {
      this.parts.forEach(part => part.classList.toggle('is-tracing', part.dataset.infraPart === this.edges[step].el.dataset.to))
      this.root.querySelector('[data-infra-readout]')!.textContent = this.edges[step].el.dataset.label!
      this.lastStep = step
    }
    this.frame = requestAnimationFrame(this.tick)
  }
}
