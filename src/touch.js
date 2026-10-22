// Small things that answer the pointer: magnetic buttons (they lean toward you, and their fill wells
// up from where you came in), and the bar that steps aside while you read down and returns when you
// scroll up.
import { reducedMotion, finePointer } from './lib.js'

export function initMagnets() {
  if (!finePointer()) return
  document.querySelectorAll('.btn').forEach((b) => {
    b.addEventListener('pointerenter', (e) => {
      const r = b.getBoundingClientRect()
      b.style.setProperty('--hx', `${e.clientX - r.left}px`)
      b.style.setProperty('--hy', `${e.clientY - r.top}px`)
    })
    if (reducedMotion() || !b.hasAttribute('data-magnet')) return
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect()
      b.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * 12}px`)
      b.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * 10}px`)
    })
    b.addEventListener('pointerleave', () => {
      b.style.setProperty('--mx', '0px')
      b.style.setProperty('--my', '0px')
    })
  })
}

export function initBar() {
  const bar = document.querySelector('[data-bar]')
  let last = scrollY
  let pending = false
  addEventListener('scroll', () => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      const y = scrollY
      bar.classList.toggle('is-solid', y > innerHeight * 0.6)
      bar.classList.toggle('is-hidden', y > innerHeight && y > last + 4)
      if (y < last - 4) bar.classList.remove('is-hidden')
      last = y
    })
  }, { passive: true })
}
