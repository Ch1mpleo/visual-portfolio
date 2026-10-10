import { gsap } from 'gsap'

export function revealBuilds(gallery: HTMLElement) {
  const specimens = Array.from(gallery.querySelectorAll<HTMLElement>('.build-specimen'))
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return
  const finish = (specimen: HTMLElement) => {
    gsap.killTweensOf(specimen)
    gsap.set(specimen, { clearProps: 'opacity,transform' })
    specimen.dataset.revealed = 'true'
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const specimen = entry.target as HTMLElement
      observer.unobserve(specimen)
      if (specimen.dataset.revealed) return
      specimen.dataset.revealed = 'true'
      gsap.to(specimen, { opacity: 1, y: 0, duration: 0.5, delay: specimens.indexOf(specimen) * 0.08, ease: 'power2.out', onComplete: () => finish(specimen) })
    })
  }, { threshold: 0.08 })
  specimens.forEach((specimen) => {
    gsap.set(specimen, { opacity: 0, y: 20 })
    observer.observe(specimen)
    specimen.addEventListener('focusin', () => { observer.unobserve(specimen); finish(specimen) })
  })
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return
    observer.disconnect()
    specimens.forEach(finish)
  })
}
