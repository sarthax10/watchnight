// What happens as you read down the house:
//   * headings rise into place word by word as they come up ([data-reveal]);
//   * the statement lights word by word with your scroll, like a candle carried along a line;
//   * the ribbon of house rules runs faster while you scroll, and turns round when you scroll back;
//   * the wick on the right edge burns down to where you are; the bar's pill follows the section;
//   * links and buttons roll their words ([data-roll]);
//   * the footer: the name fills with light where your cursor is, and a clock says what hour it is
//     at the manor;
//   * the closing film loads and plays only when you get there.
// Reduced motion: everything is simply there, lit and still.
import { reducedMotion, finePointer } from './lib.js'

const RM = reducedMotion()

/** Adds .is-in to each element once it has come well into view. */
export function onEnter(els, opts = {}) {
  const list = [...els]
  if (RM) return list.forEach((el) => el.classList.add('is-in'))
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    }
  }, { rootMargin: opts.margin || '0px 0px -12% 0px', threshold: opts.threshold || 0 })
  list.forEach((el) => io.observe(el))
}

function splitWords(el, cls) {
  const text = el.textContent.trim()
  const words = text.split(/\s+/)
  // (read aloud whole, from a hidden copy: the split words are hidden from assistive tech)
  el.textContent = ''
  const said = document.createElement('span')
  said.className = 'visually-hidden'
  said.textContent = text
  el.append(said)
  words.forEach((w, i) => {
    const outer = document.createElement('span')
    outer.className = cls
    outer.setAttribute('aria-hidden', 'true')
    if (cls === 'wd') {
      const inner = document.createElement('span')
      inner.style.setProperty('--i', i)
      inner.textContent = w
      outer.append(inner)
    } else outer.textContent = w
    el.append(outer, i < words.length - 1 ? ' ' : '')
  })
  return [...el.querySelectorAll(`.${cls}`)]
}

export function initHeadings() {
  const hs = document.querySelectorAll('[data-reveal]')
  hs.forEach((h) => splitWords(h, 'wd'))
  onEnter(hs)
}

export function initRoll() {
  if (RM) return
  document.querySelectorAll('[data-roll]').forEach((el) => {
    const t = el.textContent.trim()
    if (!t || el.querySelector('.roll')) return
    el.setAttribute('aria-label', el.getAttribute('aria-label') || t)
    el.innerHTML = `<span class="roll" aria-hidden="true"><span>${t}</span><span>${t}</span></span>`
  })
}

export function initStatement() {
  const p = document.querySelector('[data-words]')
  if (!p) return
  const words = splitWords(p, 'w')
  // (the words that carry the turn are lit warmer)
  const HOT = new Set(['face,', 'hungry.'])
  words.forEach((w) => HOT.has(w.textContent) && w.classList.add('hot'))
  if (RM) return words.forEach((w) => w.classList.add('on'))
  let pending = false
  let lit = -1
  const update = () => {
    pending = false
    const r = p.getBoundingClientRect()
    // lit from when the paragraph's top reaches 80% of the screen to when its bottom reaches 45%
    const k = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.35)))
    const n = Math.round(k * words.length)
    if (n === lit) return
    words.forEach((w, i) => w.classList.toggle('on', i < n))
    lit = n
  }
  addEventListener('scroll', () => {
    if (!pending) {
      pending = true
      requestAnimationFrame(update)
    }
  }, { passive: true })
  update()
  onEnter(document.querySelectorAll('.facts li'))
}

export function initRibbon() {
  const track = document.querySelector('.ribbon-track')
  if (!track || RM) return
  const anim = track.getAnimations()[0]
  if (!anim) return
  let last = scrollY
  let v = 0
  let dir = 1
  let raf = 0
  const settle = () => {
    v *= 0.9
    anim.playbackRate = dir * (1 + Math.min(6, v))
    raf = v > 0.02 ? requestAnimationFrame(settle) : 0
  }
  addEventListener('scroll', () => {
    const d = scrollY - last
    last = scrollY
    if (d) dir = d > 0 ? 1 : -1
    v = Math.min(8, v + Math.abs(d) / 40)
    if (!raf) raf = requestAnimationFrame(settle)
  }, { passive: true })
}

// the about section: the register inks its crimes out as it comes up; the topics are tabs (one
// shown at a time, a small flame beside the one you chose). Keys: arrows move between tabs, Home and
// End jump; the button at the foot of each topic opens the next.
export function initAbout() {
  onEnter(document.querySelectorAll('.register'), { margin: '0px 0px -25% 0px' })
  const list = document.querySelector('[data-guide]')
  if (!list) return
  const flame = list.querySelector('.guide-flame')
  const tabs = [...list.querySelectorAll('[role="tab"]')]
  const panel = (t) => document.getElementById(t.getAttribute('aria-controls'))
  const mark = (t) => {
    const vertical = getComputedStyle(list).flexDirection === 'column'
    list.style.setProperty('--gy', `${vertical ? t.offsetTop + t.offsetHeight / 2 - 5 : 0}px`)
    list.style.setProperty('--gx', `${vertical ? 0 : t.offsetLeft + t.offsetWidth / 2 - 3}px`)
  }
  const select = (t, focus = true) => {
    const old = tabs.find((x) => x.getAttribute('aria-selected') === 'true')
    if (old === t) return
    const dir = tabs.indexOf(t) > tabs.indexOf(old) ? 1 : -1
    for (const x of tabs) {
      const on = x === t
      x.setAttribute('aria-selected', String(on))
      x.tabIndex = on ? 0 : -1
      panel(x).hidden = !on
    }
    const p = panel(t)
    p.style.setProperty('--dir', dir)
    p.classList.remove('is-in')
    void p.offsetWidth // (restart the entrance)
    p.classList.add('is-in')
    if (focus) t.focus({ preventScroll: true })
    t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    mark(t)
  }
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]')
    if (t) select(t)
  })
  list.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement)
    if (i < 0) return
    let n = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = tabs.length - 1
    if (n < 0) return
    e.preventDefault()
    select(tabs[n])
  })
  document.querySelectorAll('[data-next-tab]').forEach((b) => b.addEventListener('click', () => {
    const t = document.getElementById(`tab-${b.dataset.nextTab}`)
    select(t)
    // (bring the topic's top into view if the reader had scrolled past it)
    const top = list.closest('.about-body').getBoundingClientRect().top
    if (top < 0) scrollBy({ top: top - 90, behavior: 'smooth' })
  }))
  const first = tabs.find((x) => x.getAttribute('aria-selected') === 'true')
  panel(first).classList.add('is-in')
  mark(first)
  list.classList.add('has-active')
  addEventListener('resize', () => mark(tabs.find((x) => x.getAttribute('aria-selected') === 'true')), { passive: true })
}

export function initNav() {
  const nav = document.querySelector('[data-nav]')
  if (!nav) return
  const pill = nav.querySelector('.bar-pill')
  const links = [...nav.querySelectorAll('a')]
  const map = new Map(links.map((a) => [document.querySelector(a.getAttribute('href')), a]))
  const seen = new Map()
  let current = null
  const move = (a) => {
    links.forEach((l) => l.removeAttribute('aria-current'))
    nav.classList.toggle('has-active', !!a)
    if (!a) return
    a.setAttribute('aria-current', 'true')
    const nr = nav.getBoundingClientRect()
    const r = a.getBoundingClientRect()
    pill.style.setProperty('--px', `${r.left - nr.left}px`)
    pill.style.setProperty('--pw', `${r.width}px`)
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target, e.intersectionRatio)
    // the section that holds the middle of the screen
    let best = null
    let bestR = 0
    for (const [s, r] of seen) if (r > bestR) [best, bestR] = [s, r]
    const a = bestR > 0 ? map.get(best) : null
    if (a !== current) move((current = a))
  }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.01] })
  map.forEach((_, s) => s && io.observe(s))
  addEventListener('resize', () => move(current), { passive: true })
}

const PHASES = [
  [0, 5, 'the house is asleep. Something is not.'],
  [5, 9, 'the first light is on the garden wall.'],
  [9, 12, 'the guests are at their chores.'],
  [12, 17, 'the afternoon is long and nobody is quite where they said.'],
  [17, 19, 'the bell is ringing for the Vigil.'],
  [19, 22, 'the candles are lit. Lock your door.'],
  [22, 24, 'the candles are burning low.'],
]

export function initFoot() {
  const foot = document.querySelector('[data-foot]')
  const word = document.querySelector('[data-foot-word]')
  if (!foot || !word) return
  onEnter([foot], { margin: '0px 0px -5% 0px' })
  if (finePointer() && !RM) {
    let pending = false
    let ex = 0
    let ey = 0
    foot.addEventListener('pointermove', (e) => {
      ex = e.clientX
      ey = e.clientY
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        const r = word.getBoundingClientRect()
        word.style.setProperty('--fx', `${ex - r.left}px`)
        word.style.setProperty('--fy', `${ey - r.top}px`)
      })
    }, { passive: true })
    foot.addEventListener('pointerleave', () => word.style.setProperty('--fx', '-500px'))
    word.style.setProperty('--fx', '-500px')
  }
  const clock = document.querySelector('[data-manor-clock]')
  const tick = () => {
    const d = new Date()
    const h = d.getHours()
    const hm = `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const phase = PHASES.find(([a, b]) => h >= a && h < b)[2]
    clock.textContent = `At the manor it is ${hm}, and ${phase}`
  }
  tick()
  setInterval(tick, 30000)
}

export function initLastFilm() {
  const v = document.querySelector('[data-lazy-video]')
  if (!v) return
  const saveData = navigator.connection?.saveData
  if (RM || saveData) return
  let loaded = false
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (!loaded) {
        v.src = v.dataset.lazyVideo
        loaded = true
      }
      v.play().catch(() => {})
    } else if (loaded) v.pause()
  }, { rootMargin: '200px' }).observe(v)
}
