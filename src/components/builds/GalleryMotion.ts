import { gsap } from 'gsap'

export function revealBuilds(gallery: HTMLElement) {
  const specimens = Array.from(gallery.querySelectorAll<HTMLElement>('.build-specimen'))
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  specimens.forEach((specimen) => {
    const scene = specimen.querySelector<HTMLElement>('.build-specimen__scene')!
    const x = gsap.quickTo(scene, 'x', { duration: 0.65, ease: 'power3.out' })
    const y = gsap.quickTo(scene, 'y', { duration: 0.65, ease: 'power3.out' })
    const rotation = gsap.quickTo(scene, 'rotation', { duration: 0.65, ease: 'power3.out' })
    const reset = () => {
      if (reducedMotion.matches) { gsap.killTweensOf(scene); gsap.set(scene, { clearProps: 'transform' }); return }
      x(0); y(0); rotation(0)
    }
    specimen.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return
      const rect = specimen.getBoundingClientRect()
      const dx = (event.clientX - rect.left) / rect.width - 0.5
      const dy = (event.clientY - rect.top) / rect.height - 0.5
      x(dx * 14); y(dy * 10); rotation(dx * 1.5)
    })
    specimen.addEventListener('pointerleave', reset)
    finePointer.addEventListener('change', reset)
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return
      gsap.killTweensOf(scene)
      gsap.set(scene, { clearProps: 'transform' })
    })
  })
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
