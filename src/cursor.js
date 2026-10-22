// The cursor. The pointer itself is a real system cursor (a slim wax-coloured arrow, gold over
// anything you can use: /cursor/*.svg), so it never lags and you click exactly at its tip. Around
// it, on one canvas:
//   * its light: the light in the dark (the .gloom layer's centre and reach), a little wider over
//     things you can use, breathing like a flame;
//   * a word written beside it over things you can open ("play", "accuse", "look closer");
//   * a click strikes a small ring of light and a few sparks;
//   * the double: a faint red copy of your arrow walks your exact path a second behind you, and
//     steps into you when you stop. Stay still a while and it slips out again and goes its own way,
//     lingering at buttons and links as if reading them; move, and it hurries back into your
//     footsteps. (Someone in this house is not who they say they are.)
// Fine pointers only, with motion allowed; touch screens and reduced motion keep everything plain.
import { finePointer, reducedMotion } from './lib.js'

const DELAY = 1000 // ms the double walks behind you

const root = document.documentElement
const canvas = document.querySelector('[data-cursor-canvas]')
const word = document.querySelector('[data-cur-word]')
const gloom = document.querySelector('[data-gloom]')
const ctx = canvas.getContext('2d')
const box = document.querySelector('[data-cursor-root]')

// the arrow's outline (the same shape as /cursor/arrow.svg, tip at 0,0)
const ARROW = new Path2D('M0 0v20.2l5.3-5.1 3.6 8.3 3.2-1.4-3.6-8.2h7.4z')

let dpr = 1
let on = false
let away = true
let x = -100
let y = -100
let lastX = 0
let lastY = 0
let flare = 0
let want = 0
let still = 0
let rings = []
let sparks = []
let path = []
let raf = 0
const double = { x: -100, y: -100, a: 0, mode: 'follow', vx: 0, vy: 0, tx: 0, ty: 0, wait: 0, curious: false }

function size() {
  dpr = Math.min(devicePixelRatio || 1, 2)
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
}

/** Sends the double somewhere near you: often to something you could use, sometimes just away. */
function wander(start) {
  if (start) {
    double.mode = 'wander'
    double.vx = 0
    double.vy = 0
    double.wait = 0
  }
  double.curious = false
  let tx = 0
  let ty = 0
  if (Math.random() < 0.55) {
    const near = [...document.querySelectorAll('a, button, .tile-btn, .register')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width && r.bottom > 0 && r.top < innerHeight && Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) < 520
    })
    if (near.length) {
      const r = near[(Math.random() * near.length) | 0].getBoundingClientRect()
      tx = r.left + r.width * (0.2 + Math.random() * 0.6)
      ty = r.top + r.height / 2
      double.curious = true
    }
  }
  if (!double.curious) {
    const a = Math.random() * Math.PI * 2
    const r = 120 + Math.random() * 260
    tx = x + Math.cos(a) * r
    ty = y + Math.sin(a) * r * 0.7
  }
  double.tx = Math.min(innerWidth - 30, Math.max(30, tx))
  double.ty = Math.min(innerHeight - 30, Math.max(70, ty))
}

// where you were DELAY ms ago (interpolated along the recorded path, never past its end)
function behind(now) {
  const t = now - DELAY
  while (path.length > 2 && path[1].t <= t) path.shift()
  if (!path.length) return null
  if (path.length === 1 || path[0].t >= t) return path[0]
  const a = path[0]
  const b = path[1]
  const k = Math.min(1, (t - a.t) / Math.max(1, b.t - a.t))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

function moveDouble(now) {
  const b = behind(now)
  if (double.mode === 'follow') {
    if (b) {
      double.x = b.x
      double.y = b.y
    }
    // still for a while, and it has caught up: it slips away to look around on its own
    if (!away && still > 170 && Math.hypot(double.x - x, double.y - y) < 4) wander(true)
  } else if (double.mode === 'wander') {
    const tx = double.tx - double.x
    const ty = double.ty - double.y
    const d = Math.hypot(tx, ty)
    if (double.wait > 0) {
      double.wait -= 1
      double.vx *= 0.85
      double.vy *= 0.85
    } else if (d < 3) {
      // arrived: it lingers (longest at things you could use, as if reading them), then moves on
      double.wait = double.curious ? 90 + Math.random() * 90 : 30 + Math.random() * 60
      wander(false)
    } else {
      const sp = Math.min(1.6, d * 0.05 + 0.35)
      double.vx += ((tx / d) * sp - double.vx) * 0.08
      double.vy += ((ty / d) * sp - double.vy) * 0.08
    }
    double.x += double.vx
    double.y += double.vy
  } else {
    // you moved: it hurries back into your footsteps
    const t = b || { x, y }
    double.x += (t.x - double.x) * 0.14
    double.y += (t.y - double.y) * 0.14
    if (Math.hypot(t.x - double.x, t.y - double.y) < 5) double.mode = 'follow'
  }
  const dd = Math.hypot(double.x - x, double.y - y)
  const wantA = away && double.mode !== 'wander' ? 0 : dd > 24 ? 0.5 : (dd / 24) * 0.5
  double.a += (wantA - double.a) * 0.08
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  const speed = Math.hypot(x - lastX, y - lastY)
  lastX = x
  lastY = y
  still = speed < 0.3 ? still + 1 : 0
  flare += (want - flare) * 0.15
  moveDouble(now)

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  // the double: your arrow, gone red and faint, a little unsteady
  if (double.a > 0.02) {
    ctx.save()
    ctx.translate(Math.round(double.x), Math.round(double.y))
    ctx.globalAlpha = double.a * (0.85 + Math.random() * 0.15)
    ctx.shadowColor = 'rgba(255, 50, 40, .8)'
    ctx.shadowBlur = 10
    ctx.fillStyle = 'rgba(120, 18, 16, .85)'
    ctx.fill(ARROW)
    ctx.shadowBlur = 0
    ctx.lineWidth = 1.2
    ctx.strokeStyle = '#ff5a4a'
    ctx.stroke(ARROW)
    ctx.restore()
  }
  // a click's ring and sparks
  rings = rings.filter((r) => r.t < 1)
  for (const r of rings) {
    r.t += 0.035
    const e = 1 - (1 - r.t) ** 3
    ctx.globalAlpha = (1 - r.t) * 0.9
    ctx.strokeStyle = '#ffd98a'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(r.x, r.y, 4 + e * 26, 0, Math.PI * 2)
    ctx.stroke()
  }
  sparks = sparks.filter((p) => p.life < p.max)
  for (const p of sparks) {
    p.life += 1
    p.vy += 0.08
    p.x += p.vx
    p.y += p.vy
    const k = 1 - p.life / p.max
    ctx.globalAlpha = k
    ctx.fillStyle = k > 0.5 ? '#ffd98a' : '#e8803a'
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
  }
  ctx.globalAlpha = 1

  // the light in the dark breathes a little, like a flame
  const r = (250 + flare * 80) * (0.97 + Math.sin(now / 180) * 0.015 + Math.random() * 0.015)
  gloom.style.setProperty('--cx', `${x}px`)
  gloom.style.setProperty('--cy', `${y}px`)
  gloom.style.setProperty('--r', `${r.toFixed(0)}px`)
  word.style.transform = `translate3d(${x + 22}px, ${y + 14}px, 0)`

  // idle and empty: rest (the next move wakes it)
  if (away && !rings.length && !sparks.length && double.a < 0.02 && double.mode !== 'wander') {
    cancelAnimationFrame(raf)
    raf = 0
    ctx.clearRect(0, 0, innerWidth, innerHeight)
  }
}

function wake() {
  if (!raf && on) {
    lastX = x
    lastY = y
    raf = requestAnimationFrame(frame)
  }
}

let wordFor = null
function setWord(el) {
  const target = el?.closest?.('[data-cursor]') || null
  const label = target?.dataset.cursor || ''
  const usable = target || el?.closest?.('a, button, [role="menuitem"], [role="tab"], [role="slider"], input, label, summary')
  want = usable ? 1 : 0
  if (target === wordFor) return
  wordFor = target
  word.classList.remove('is-on')
  if (!label) return
  word.textContent = label
  void word.offsetWidth // (restart the writing)
  word.style.setProperty('--n', label.length)
  word.classList.add('is-on')
}

/** Moves the cursor's layer into a top-layer element (an open <dialog>) and back out (null). */
export function cursorHost(el) {
  ;(el || document.body).append(box)
}

export function initCursor() {
  const enable = () => {
    on = finePointer() && !reducedMotion()
    root.classList.toggle('has-cursor', on)
    if (!on) {
      gloom.style.setProperty('--cx', '50%')
      gloom.style.setProperty('--cy', '40%')
      gloom.style.setProperty('--r', '60vmax')
    }
  }
  size()
  enable()
  addEventListener('resize', size, { passive: true })
  matchMedia('(pointer: fine)').addEventListener('change', enable)
  addEventListener('pointermove', (e) => {
    if (!on || e.pointerType !== 'mouse') return
    x = e.clientX
    y = e.clientY
    if (away) {
      away = false
      if (double.mode !== 'wander') {
        double.x = x
        double.y = y
      }
      path = []
    }
    path.push({ t: performance.now(), x, y })
    if (path.length > 240) path.shift()
    if (double.mode === 'wander') double.mode = 'return'
    setWord(e.target instanceof Element ? e.target : null)
    wake()
  }, { passive: true })
  addEventListener('scroll', () => {
    if (on && !away) setWord(document.elementFromPoint(x, y))
  }, { passive: true })
  addEventListener('pointerdown', (e) => {
    if (!on || e.pointerType !== 'mouse' || e.button !== 0) return
    rings.push({ x: e.clientX, y: e.clientY, t: 0 })
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 1 + Math.random() * 1.8
      sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 0, max: 18 + Math.random() * 14 })
    }
    wake()
  }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => {
    away = true
    word.classList.remove('is-on')
    wordFor = null
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    } else wake()
  })

  // the dark only falls while a night section is on screen
  const dark = new Set()
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? dark.add(e.target) : dark.delete(e.target)
    root.classList.toggle('is-dark', dark.size > 0)
  }, { threshold: 0.3 })
  document.querySelectorAll('[data-dark]').forEach((s) => io.observe(s))
}
