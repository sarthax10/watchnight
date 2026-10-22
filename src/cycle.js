// A day in the house: the clock on the pinned scene runs from 09:00 to 23:00 as you scroll through
// it. Where the browser has no scroll-driven animations, this also cross-fades the three paintings
// (the CSS does it natively elsewhere).
const NATIVE = CSS.supports('(animation-timeline: view()) and (animation-range: entry)')

function band(p, a, b) {
  return Math.min(1, Math.max(0, (p - a) / (b - a)))
}

export function initCycle() {
  const section = document.querySelector('.cycle')
  const text = document.querySelector('[data-clock-text]')
  const dusk = section?.querySelector('.cycle-dusk')
  const night = section?.querySelector('.cycle-night')
  if (!section) return
  let active = false
  let pending = false
  let last = ''
  const update = () => {
    pending = false
    const r = section.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
    // 09:00 -> 23:00, in quarter hours
    const mins = Math.round((9 * 60 + p * 14 * 60) / 15) * 15
    const s = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    if (s !== last) text.textContent = last = s
    if (!NATIVE) {
      dusk.style.opacity = band(p, 0.26, 0.42)
      night.style.opacity = band(p, 0.62, 0.78)
    }
  }
  const onScroll = () => {
    if (active && !pending) {
      pending = true
      requestAnimationFrame(update)
    }
  }
  new IntersectionObserver(([e]) => {
    active = e.isIntersecting
    if (active) update()
  }).observe(section)
  addEventListener('scroll', onScroll, { passive: true })
}
