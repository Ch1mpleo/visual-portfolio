const events = new Set([
  'section_view', 'navigation_click', 'project_open', 'project_inspect',
  'component_open', 'component_view', 'component_copy', 'component_download',
  'resume_open', 'resume_pdf_open', 'resume_download', 'contact_click',
  'outbound_click', 'goat_video_open', 'theme_change',
])
type EventName = 'section_view' | 'navigation_click' | 'project_open' | 'project_inspect' |
  'component_open' | 'component_view' | 'component_copy' | 'component_download' |
  'resume_open' | 'resume_pdf_open' | 'resume_download' | 'contact_click' |
  'outbound_click' | 'goat_video_open' | 'theme_change'
type Parameters = Partial<Record<'section_id' | 'content_id' | 'content_type' | 'destination' | 'action' | 'language', string>>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let measurementId = ''
let started = false

export function isPublicTrackingHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host.includes(':') || /\.(localhost|local|internal|test|example|invalid)$/.test(host)) return false
  if (/^\d+(\.\d+){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) return false
  }
  return true
}

/** Called only by the page entry point. Tracking is inert in development/local previews. */
export function startAnalytics(production: boolean, id: string): boolean {
  if (started) return true
  if (!production || !/^G-[A-Z0-9]+$/.test(id) || window.location.protocol !== 'https:' || !isPublicTrackingHost(window.location.hostname)) return false
  try {
    window.dataLayer ||= []
    window.gtag ||= function () { window.dataLayer!.push(arguments) }
    measurementId = id
    window.gtag('js', new Date())
    window.gtag('config', id)
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    document.head.append(script)
    started = true
    return true
  } catch {
    measurementId = ''
    return false
  }
}

/** Only site-authored, bounded identifiers belong in custom event parameters. */
export function trackEvent(name: EventName, parameters: Parameters = {}): void {
  if (!started || !events.has(name)) return
  try {
    const safe: Record<string, string> = { send_to: measurementId }
    for (const key of ['section_id', 'content_id', 'content_type', 'destination', 'action', 'language'] as const) {
      const value = parameters[key]
      if (typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,99}$/.test(value)) safe[key] = value
    }
    window.gtag?.('event', name, safe)
  } catch { /* Analytics must never own the outcome of a site interaction. */ }
}

export function createSectionDwell(
  report: (id: string) => void,
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (id: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  const visible = new Set<string>(), sent = new Set<string>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let paused = false
  const arm = (id: string) => {
    if (paused || sent.has(id) || timers.has(id)) return
    timers.set(id, schedule(() => {
      timers.delete(id)
      sent.add(id)
      report(id)
    }, 1000))
  }
  return {
    enter(id: string) { visible.add(id); arm(id) },
    leave(id: string) { visible.delete(id); const timer = timers.get(id); if (timer !== undefined) cancel(timer); timers.delete(id) },
    pause() { paused = true; timers.forEach(cancel); timers.clear() },
    resume() { paused = false; visible.forEach(arm) },
  }
}

function context(element: Element): Parameters {
  const project = element.closest<HTMLElement>('[data-viewer-project]')
  if (project) return { section_id: 'builds', content_id: project.dataset.viewerProject }
  if (element.closest('#resume-viewer')) return { section_id: 'resume' }
  return { section_id: element.closest<HTMLElement>('[data-analytics-section]')?.dataset.analyticsSection || (element.closest('.site-head') ? 'header' : 'site') }
}

export function installInteractionTracking(): void {
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return
    const element = event.target.closest<HTMLElement>('a[href], button, [data-arch-select]')
    if (!element || element.matches(':disabled, [inert]') || element.closest('[inert]')) return
    const parameters = context(element)
    if (element.hasAttribute('data-arch-select')) {
      trackEvent('project_inspect', { ...parameters, action: element.dataset.archSelect })
      return
    }
    if (element.matches('.js-theme')) {
      queueMicrotask(() => trackEvent('theme_change', { action: document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light' }))
      return
    }
    if (!(element instanceof HTMLAnchorElement)) return
    const url = new URL(element.href, location.href)
    if (url.protocol === 'mailto:') {
      trackEvent('contact_click', { ...parameters, action: 'email' })
    } else if (url.origin === location.origin && /\/documents\/resume\.pdf$/.test(url.pathname)) {
      // Normal activation opens the viewer; modified/middle clicks follow the PDF link.
      if (element.hasAttribute('data-open-resume') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) return
      trackEvent(element.hasAttribute('download') ? 'resume_download' : 'resume_pdf_open', parameters)
    } else if (url.origin === location.origin && (url.hash || url.pathname === location.pathname)) {
      const destination = url.hash.slice(1) || 'home'
      if (['home', 'about', 'builds', 'components', 'work', 'contact'].includes(destination)) trackEvent('navigation_click', { ...parameters, destination })
    } else if (['https:', 'http:'].includes(url.protocol) && url.origin !== location.origin) {
      trackEvent('outbound_click', { ...parameters, destination: `${url.origin}${url.pathname}`.slice(0, 100) })
    }
  }
  document.addEventListener('click', click, true)
  document.addEventListener('auxclick', event => { if (event.button === 1) click(event) }, true)

  if (!('IntersectionObserver' in window)) return
  const dwell = createSectionDwell(section_id => trackEvent('section_view', { section_id }))
  const sync = () => {
    if (document.hidden || document.querySelector('dialog[open], .js-vp[aria-hidden="false"], .js-intro')) dwell.pause()
    else dwell.resume()
  }
  const sections = [...document.querySelectorAll<HTMLElement>('[data-analytics-section]')]
  let observer: IntersectionObserver | undefined
  const observe = () => {
    observer?.disconnect()
    sections.forEach(section => dwell.leave(section.dataset.analyticsSection!))
    // IntersectionObserver resolves percentage margins against width, even vertically.
    const margin = Math.round(window.innerHeight * .35)
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const id = (entry.target as HTMLElement).dataset.analyticsSection!
      if (entry.isIntersecting) dwell.enter(id)
      else dwell.leave(id)
    }), { rootMargin: `-${margin}px 0px -${margin}px 0px`, threshold: 0 })
    sections.forEach(section => observer!.observe(section))
  }
  observe()
  window.addEventListener('resize', observe)
  const changes = new MutationObserver(sync)
  changes.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  document.querySelectorAll('dialog, .js-vp').forEach(dialog => changes.observe(dialog, { attributes: true, attributeFilter: ['open', 'aria-hidden'] }))
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('pagehide', () => dwell.pause())
  window.addEventListener('pageshow', sync)
  sync()
}
