export const RECORDING_CHOICE_KEY = 'portfolio-recordings'
type Choice = 'granted' | 'denied' | null
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>

export function createRecordingConsent(options: { storage?: StorageAccess; load: () => void; stop: () => void }) {
  let choice: Choice = null
  let active = false
  const apply = (value: string | null) => {
    choice = value === 'granted' || value === 'denied' ? value : null
    try {
      if (choice === 'granted' && !active) { options.load(); active = true }
      else if (choice !== 'granted' && active) { options.stop(); active = false }
    } catch { /* Blocked storage/scripts must not interrupt the portfolio. */ }
  }
  try { apply(options.storage?.getItem(RECORDING_CHOICE_KEY) ?? null) } catch {}
  return {
    get choice() { return choice },
    setChoice(value: Exclude<Choice, null>) {
      try { options.storage?.setItem(RECORDING_CHOICE_KEY, value) } catch {}
      apply(value)
    },
    syncChoice: apply,
  }
}

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] }
declare global { interface Window { clarity?: Clarity } }

export function installRecordingPreferences(root: HTMLElement, enabled: boolean): void {
  const id = root.dataset.clarityId || ''
  if (!enabled || !/^[a-z0-9]{5,24}$/.test(id)) return
  const toggle = root.querySelector<HTMLButtonElement>('[data-recording-toggle]')!
  const panel = root.querySelector<HTMLElement>('[data-recording-panel]')!
  const status = root.querySelector<HTMLElement>('[data-recording-status]')!
  let script: HTMLScriptElement | undefined
  const command = (...args: unknown[]) => { try { window.clarity?.(...args) } catch {} }
  const clearPendingConsent = () => {
    // The bootstrap and stopped SDK both queue commands. Drop stale choices so a
    // rapid revoke/regrant cannot replay an old stop after the new grant.
    if (window.clarity?.q) window.clarity.q = window.clarity.q.filter(call => !['consentv2', 'start', 'stop'].includes(String(call[0])))
  }
  const clearCookies = () => {
    try {
      for (const name of ['_clck', '_clsk']) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
        const labels = location.hostname.split('.')
        for (let i = 0; i < labels.length - 1; i++) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${labels.slice(i).join('.')}; SameSite=Lax`
      }
    } catch {}
  }
  const stopRecording = () => {
    clearPendingConsent()
    // The first tag can load before the runtime bundle. Its metadata callback
    // runs after runtime startup; clean up any late cookies after the queued stop.
    command('metadata', () => queueMicrotask(() => { if (consent.choice !== 'granted') clearCookies() }), false)
    command('stop')
    // consentv2(denied) restarts the SDK in cookieless mode. Stop entirely instead
    // and expire only Clarity's cookies, at host and parent-domain scopes.
    clearCookies()
  }
  let storage: Storage | undefined
  try { storage = localStorage } catch {}
  const consent = createRecordingConsent({
    storage,
    load() {
      window.clarity ||= Object.assign((...args: unknown[]) => { window.clarity!.q!.push(args) }, { q: [] as unknown[][] })
      clearPendingConsent()
      command('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })
      if (script) { command('start', { projectId: id }); return }
      script = document.createElement('script')
      script.async = true
      script.src = `https://www.clarity.ms/tag/${id}`
      script.addEventListener('load', () => {
        if (consent.choice !== 'granted') stopRecording()
      })
      document.head.append(script)
    },
    stop: stopRecording,
  })
  const render = (expanded = false) => {
    root.hidden = false
    panel.hidden = !expanded
    toggle.setAttribute('aria-expanded', String(expanded))
    toggle.textContent = `Recording: ${consent.choice === 'granted' ? 'allowed' : 'off'}`
    status.textContent = consent.choice === 'granted' ? 'You have allowed session recording.' : 'Session recording is off.'
  }
  const close = () => { render(); if (panel.contains(document.activeElement)) toggle.focus({ preventScroll: true }) }
  toggle.addEventListener('click', () => render(panel.hidden))
  root.querySelector('[data-recording-allow]')!.addEventListener('click', () => { consent.setChoice('granted'); close() })
  root.querySelector('[data-recording-deny]')!.addEventListener('click', () => { consent.setChoice('denied'); close() })
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  })
  window.addEventListener('storage', event => {
    if (event.storageArea === storage && (event.key === RECORDING_CHOICE_KEY || event.key === null)) { consent.syncChoice(event.newValue); render(!panel.hidden) }
  })
  render(consent.choice === null)
}
