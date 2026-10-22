// The title steals faces: touch a letter and it flickers through other letters of the name, red for a
// moment, before it settles back into itself. While the title is on screen, now and then one letter
// does it on its own (never with reduced motion). The heading keeps its accessible name.
import { reducedMotion } from './lib.js'

const POOL = 'WATCHNIGHTMRSDLEVOU'

function steal(span) {
  if (span.dataset.busy) return
  span.dataset.busy = '1'
  const own = span.dataset.ch
  span.classList.add('is-stolen')
  let n = 0
  const timer = setInterval(() => {
    n += 1
    if (n > 5) {
      clearInterval(timer)
      span.textContent = own
      span.classList.remove('is-stolen')
      delete span.dataset.busy
      return
    }
    let c = own
    while (c === own) c = POOL[Math.floor(Math.random() * POOL.length)]
    span.textContent = c
  }, 55)
}

export function initSteal() {
  const title = document.querySelector('[data-steal]')
  if (!title) return
  const word = title.textContent.trim()
  title.textContent = ''
  ;[...word].forEach((ch, i) => {
    const s = document.createElement('span')
    s.className = 'ch'
    s.style.setProperty('--i', i)
    s.dataset.ch = ch
    s.textContent = ch
    s.setAttribute('aria-hidden', 'true')
    title.append(s)
  })
  const letters = [...title.querySelectorAll('.ch')]
  title.addEventListener('pointerover', (e) => {
    const s = e.target.closest('.ch')
    if (s) steal(s)
  })
  if (reducedMotion()) return
  let visible = true
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(title)
  setInterval(() => {
    if (visible && !document.hidden) steal(letters[Math.floor(Math.random() * letters.length)])
  }, 5200)
}
