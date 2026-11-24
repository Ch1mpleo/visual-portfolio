const catchDuration = 1060

export function animateRecordCatch(
  dialog: HTMLElement,
  stage: HTMLElement,
  platter: HTMLElement,
  disc: HTMLElement,
  record: HTMLElement,
  jacket: HTMLElement,
  start: DOMRect,
  returning = false,
) {
  const stageBounds = stage.getBoundingClientRect()
  const dialogBounds = dialog.getBoundingClientRect()
  const target = platter.getBoundingClientRect()
  if (!start.width || !target.width) return

  const x = target.x + target.width / 2 - (start.x + start.width / 2)
  const y = target.y + target.height / 2 - (start.y + start.height / 2)
  const origin = `${target.x + target.width / 2 - stageBounds.x}px ${target.y + target.height / 2 - stageBounds.y}px`
  const scaleX = target.width / start.width
  const scaleY = target.height / start.height
  const jacketEdge = jacket.getBoundingClientRect().left
  const jacketClip = (recordBounds: DOMRect) =>
    `inset(0 ${Math.max(0, Math.min(100, (recordBounds.right - jacketEdge) / recordBounds.width * 100))}% 0 0)`

  const flyingRecord = record.cloneNode(true) as HTMLElement
  flyingRecord.classList.add('music-player__flight-record')
  flyingRecord.style.left = `${start.x - dialogBounds.x}px`
  flyingRecord.style.top = `${start.y - dialogBounds.y}px`
  dialog.append(flyingRecord)

  const seat = `translate(${x}px, ${y}px) rotate(-4deg) scale(${scaleX}, ${scaleY})`
  const flight = flyingRecord.animate([
    {
      transform: 'translate(0, 0)',
      clipPath: jacketClip(start),
      easing: 'cubic-bezier(.3,.2,.45,1)',
    },
    {
      transform: `translate(${x * .27}px, 8px) rotate(-12deg) scale(1.06, .95)`,
      offset: .22,
      clipPath: 'inset(0 0% 0 0)',
      easing: 'cubic-bezier(.35,.12,.35,1)',
    },
    {
      transform: `translate(${x * .84}px, ${y - 16}px) rotate(-28deg) scale(1.65, 1.16)`,
      offset: .70,
      easing: 'cubic-bezier(.15,.6,.24,1)',
    },
    { transform: seat, opacity: 1, offset: .86 },
    { transform: seat, opacity: 0 },
  ], { duration: catchDuration, fill: 'both' })

  const deck = stage.animate([
    { transform: 'translate(-110vw, 35px) rotate(-12deg) scale(.88)' },
    {
      transform: 'translate(-110vw, 35px) rotate(-12deg) scale(.88)',
      offset: 310 / catchDuration,
      easing: 'cubic-bezier(.42,0,.7,.55)',
    },
    {
      transform: 'translate(-24%, 18px) rotate(-7deg) scale(.96)',
      offset: (310 + 750 * .51) / catchDuration,
      easing: 'cubic-bezier(.15,.63,.28,1)',
    },
    { transform: 'none', offset: (310 + 750 * .8) / catchDuration, easing: 'ease-out' },
    { transform: 'translate(5px, 4px) rotate(1.4deg) scale(1.012)', offset: (310 + 750 * .9) / catchDuration, easing: 'ease-in-out' },
    { transform: 'none' },
  ].map(frame => ({ ...frame, opacity: 1, transformOrigin: origin })), {
    duration: catchDuration,
    fill: 'both',
  })

  const recordSeat = disc.animate([
    { opacity: 0, offset: 0 },
    { opacity: 0, offset: .86 },
    { opacity: 1 },
  ], { duration: catchDuration, fill: 'both' })
  const animations = [flight, deck, recordSeat]
  if (returning) {
    for (const animation of animations) {
      animation.currentTime = catchDuration
      animation.reverse()
    }
  }

  return {
    get finished() {
      return Promise.all(animations.map(animation => animation.finished))
    },
    async returnTo(destination: DOMRect) {
      animations.forEach(animation => animation.reverse())
      await Promise.all(animations.map(animation => animation.finished))
      const tuckX = destination.x - start.x
      if (Math.abs(tuckX) < 1 || !flyingRecord.isConnected) return
      const tuck = flyingRecord.animate([
        { transform: 'translateX(0)', clipPath: jacketClip(start) },
        { transform: `translateX(${tuckX}px)`, clipPath: jacketClip(destination) },
      ], { duration: 160, easing: 'cubic-bezier(.22,.72,.34,1)', fill: 'both' })
      animations.push(tuck)
      await tuck.finished
    },
    cancel() {
      animations.forEach(animation => animation.cancel())
      flyingRecord.remove()
    },
  }
}
