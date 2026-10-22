// The hero: the walled garden at night, and the oak in it is awake.
//   * the opening: the garden in the dark, lightning twice, then the name rises letter by letter and
//     the line beneath it decodes out of stray letters;
//   * the oak's eyes: a red glow laid over the painted ones (found in the picture: the eyes sit at a
//     known point of each image, mapped through object-fit: cover), brighter the nearer your cursor
//     comes; close enough and it says so. Now and then it blinks;
//   * a slow pointer parallax on the painting, the rain, and motes of lamplight drifting up through it
//     (canvases that run only while the hero is on screen and the tab is visible).
// Reduced motion: no flash, no parallax, no rain or motes; the eyes keep a still, low glow.
import { reducedMotion, lightsOn, finePointer } from './lib.js'
import { thunder } from './sound.js'

const root = document.documentElement
const hero = document.querySelector('.hero')
const art = document.querySelector('[data-art]')
const img = art?.querySelector('img')

// where the eyes are, as fractions of each picture (measured from the renders' red pixels)
const EYES = {
  garden_night: { x: 0.7313, y: 0.431, w: 2560, h: 1421, gap: 0.0085 },
  cuP_oak_night: { x: 0.5045, y: 0.4533, w: 1080, h: 1421, gap: 0.034 },
}

export function intro() {
  const flash = document.querySelector('[data-flash]')
  const seen = sessionStorage.getItem('wn:intro')
  if (reducedMotion() || seen) {
    root.classList.add('lit')
    decode()
    return
  }
  try {
    sessionStorage.setItem('wn:intro', '1')
  } catch {
    /* fine */
  }
  root.classList.add('intro')
  const go = () => {
    // two strikes, as real lightning does, then the garden stays lit
    flash.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0.1 }, { opacity: 0.6 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' })
    thunder()
    setTimeout(() => {
      root.classList.remove('intro')
      root.classList.add('lit')
      setTimeout(decode, 700)
    }, 120)
  }
  ;(img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => setTimeout(go, 450))
}

// the line under the name settles out of stray letters, left to right
function decode() {
  const el = document.querySelector('[data-decode]')
  if (!el || reducedMotion()) return
  const final = el.textContent
  el.setAttribute('aria-label', final)
  const pool = 'abcdefghijklmnopqrstuvwxyz'
  const t0 = performance.now()
  const dur = 1300
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const fixed = Math.floor(final.length * k)
    let out = ''
    for (let i = 0; i < final.length; i++) {
      const c = final[i]
      if (i < fixed || c === ' ' || /[.,]/.test(c)) out += c
      else if (i < fixed + 10) out += `<span class="glyph">${pool[(Math.random() * pool.length) | 0]}</span>`
      else out += '<span class="glyph"> </span>'
    }
    el.innerHTML = out
    if (k < 1) requestAnimationFrame(step)
    else el.textContent = final
  }
  requestAnimationFrame(step)
}

// --- the eyes -------------------------------------------------------------------------------------
export function initEyes() {
  const eyes = document.querySelector('[data-eyes]')
  const whisper = document.querySelector('[data-whisper]')
  if (!eyes || !img) return
  let spot = null // the eyes' centre in viewport px, and their spacing
  const place = () => {
    const which = (img.currentSrc || img.src).includes('cuP_') ? EYES.cuP_oak_night : EYES.garden_night
    const W = art.clientWidth
    const H = art.clientHeight
    const s = Math.max(W / which.w, H / which.h)
    const dw = which.w * s
    const dh = which.h * s
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100)
    const ox = (W - dw) * pos[0]
    const oy = (H - dh) * pos[1]
    const ex = ox + which.x * dw
    const ey = oy + which.y * dh
    const es = which.gap * dw
    eyes.style.setProperty('--ex', `${ex}px`)
    eyes.style.setProperty('--ey', `${ey}px`)
    eyes.style.setProperty('--es', `${Math.max(6, es)}px`)
    const r = art.getBoundingClientRect()
    spot = { x: r.left + ex, y: r.top + ey, es }
    const hr = hero.getBoundingClientRect()
    whisper.style.setProperty('--wx', `${r.left - hr.left + ex}px`)
    whisper.style.setProperty('--wy', `${r.top - hr.top + ey + es * 2.5 + 18}px`)
  }
  const ready = () => {
    place()
    addEventListener('resize', place, { passive: true })
  }
  if (img.complete) ready()
  else img.addEventListener('load', ready, { once: true })
  if (reducedMotion()) return
  let heat = 0
  let want = 0
  let raf = 0
  const tick = () => {
    heat += (want - heat) * 0.08
    eyes.style.setProperty('--heat', heat.toFixed(3))
    whisper.classList.toggle('is-on', heat > 0.8)
    raf = Math.abs(want - heat) > 0.004 ? requestAnimationFrame(tick) : 0
  }
  addEventListener('pointermove', (e) => {
    if (!spot || scrollY > innerHeight) return
    const r = art.getBoundingClientRect()
    // (the art moves with the parallax: re-read where the eyes are on screen)
    const ex = r.left + parseFloat(eyes.style.getPropertyValue('--ex'))
    const ey = r.top + parseFloat(eyes.style.getPropertyValue('--ey'))
    const d = Math.hypot(e.clientX - ex, e.clientY - ey)
    want = Math.max(0, 1 - d / (Math.min(innerWidth, innerHeight) * 0.55)) ** 1.6
    if (!raf) raf = requestAnimationFrame(tick)
  }, { passive: true })
  // now and then, it blinks
  const blink = () => {
    if (!document.hidden && scrollY < innerHeight) {
      eyes.classList.add('is-blink')
      setTimeout(() => eyes.classList.remove('is-blink'), 140)
    }
    setTimeout(blink, 4000 + Math.random() * 6000)
  }
  setTimeout(blink, 5000)
}

// --- parallax ---------------------------------------------------------------------------------
export function initTilt() {
  if (!art || reducedMotion() || !finePointer()) return
  let pending = false
  let nx = 0
  let ny = 0
  addEventListener('pointermove', (e) => {
    if (scrollY > innerHeight) return
    nx = e.clientX / innerWidth - 0.5
    ny = e.clientY / innerHeight - 0.5
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      art.style.setProperty('--tx', `${(-nx * 22).toFixed(1)}px`)
      art.style.setProperty('--ty', `${(-ny * 14).toFixed(1)}px`)
    })
  }, { passive: true })
}

// --- canvases that run only while seen -------------------------------------------------------------
function loopWhileSeen(canvas, tick) {
  let on = false
  let inView = true
  const run = () => {
    if (!on) return
    tick()
    requestAnimationFrame(run)
  }
  const set = () => {
    const want = inView && !document.hidden && !lightsOn()
    if (want && !on) {
      on = true
      requestAnimationFrame(run)
    } else if (!want) on = false
  }
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting
    set()
  }).observe(canvas)
  document.addEventListener('visibilitychange', set)
  addEventListener('wn:lights', set)
}

function sizer(canvas, onSize) {
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  const size = () => {
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    onSize(canvas.clientWidth, canvas.clientHeight, dpr)
  }
  size()
  addEventListener('resize', size, { passive: true })
}

export function initRain() {
  const canvas = document.querySelector('[data-rain]')
  if (!canvas || reducedMotion()) return
  const ctx = canvas.getContext('2d')
  let drops = []
  let w = 0
  let h = 0
  let dpr = 1
  sizer(canvas, (cw, ch, d) => {
    w = cw
    h = ch
    dpr = d
    const n = Math.round((w * h) / 3600)
    drops = Array.from({ length: n }, () => {
      const z = Math.random() // depth: near drops are longer, faster, brighter
      return { x: Math.random() * w, y: Math.random() * h, l: 6 + z * 22, v: 7 + z * 12, a: 0.06 + z * 0.24 }
    })
  })
  loopWhileSeen(canvas, () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = dpr
    ctx.lineCap = 'round'
    for (const d of drops) {
      d.y += d.v
      d.x -= d.v * 0.16
      if (d.y > h) {
        d.y = -d.l
        d.x = Math.random() * w * 1.2
      }
      ctx.strokeStyle = `rgba(205, 218, 232, ${d.a})`
      ctx.beginPath()
      ctx.moveTo(d.x * dpr, d.y * dpr)
      ctx.lineTo((d.x - d.l * 0.16) * dpr, (d.y + d.l) * dpr)
      ctx.stroke()
    }
  })
}

export function initMotes() {
  const canvas = document.querySelector('[data-motes]')
  if (!canvas || reducedMotion()) return
  const ctx = canvas.getContext('2d')
  // one soft sprite, drawn once, stamped for every mote
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 32
  const sg = sprite.getContext('2d')
  const g = sg.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255, 236, 190, 1)')
  g.addColorStop(0.25, 'rgba(255, 196, 110, .55)')
  g.addColorStop(1, 'rgba(255, 170, 80, 0)')
  sg.fillStyle = g
  sg.fillRect(0, 0, 32, 32)
  let motes = []
  let w = 0
  let h = 0
  let dpr = 1
  let px = -999
  let py = -999
  const make = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    s: 4 + Math.random() * 9,
    vy: 0.12 + Math.random() * 0.35,
    ph: Math.random() * Math.PI * 2,
    fl: 0.6 + Math.random() * 1.6,
    vx: 0,
  })
  sizer(canvas, (cw, ch, d) => {
    w = cw
    h = ch
    dpr = d
    motes = Array.from({ length: Math.round(Math.min(70, (w * h) / 26000)) }, () => make(true))
  })
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    px = e.clientX - r.left
    py = e.clientY - r.top
  }, { passive: true })
  let t = 0
  loopWhileSeen(canvas, () => {
    t += 1 / 60
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      // drift up, sway, and shy away from the pointer
      const dx = m.x - px
      const dy = m.y - py
      const d2 = dx * dx + dy * dy
      if (d2 < 120 * 120) {
        const f = (1 - Math.sqrt(d2) / 120) * 0.6
        m.vx += (dx / (Math.sqrt(d2) + 1)) * f
        m.y += (dy / (Math.sqrt(d2) + 1)) * f
      }
      m.vx *= 0.94
      m.x += Math.sin(t * 0.6 + m.ph) * 0.25 + m.vx
      m.y -= m.vy
      if (m.y < -20) Object.assign(m, make(false))
      const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * m.fl + m.ph))
      ctx.globalAlpha = a * Math.min(1, (h - m.y) / 120 + 0.2)
      const s = m.s * dpr
      ctx.drawImage(sprite, m.x * dpr - s / 2, m.y * dpr - s / 2, s, s)
    }
    ctx.globalAlpha = 1
  })
}
