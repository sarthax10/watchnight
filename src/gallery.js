// The gallery: the house's pictures (the garden, the rooms, the nights), hung along a corridor.
//   * the corridor: walked with your scroll (see initCorridor); the films play as moving paintings;
//   * open one and it grows out of its tile into the viewer: one <dialog> for stills and film, with
//     arrows, a counter, a caption and a strip of thumbnails. Stills zoom (click, the wheel, or the
//     button; +/- and 0 on the keyboard) and pan by dragging when zoomed; on a touch screen, swipe to
//     walk the garden, double-tap to zoom. Films play in the site's own player.
// Keys: Left/Right walk, Home/End jump, Escape closes (focus goes back to the tile you opened).
import { reducedMotion } from './lib.js'
import { createPlayer } from './player.js'
import { cursorHost } from './cursor.js'

const lb = document.querySelector('[data-lb]')
const stage = lb.querySelector('[data-lb-stage]')
const count = lb.querySelector('[data-lb-count]')
const cap = lb.querySelector('[data-lb-cap]')
const thumbs = lb.querySelector('[data-lb-thumbs]')
const zoomBtn = lb.querySelector('[data-lb-zoom]')

let items = []
let index = 0
let opener = null
let player = null
let view = { s: 1, x: 0, y: 0 } // the still's zoom and pan
let imgEl = null

// (the rooms are cropped renders, 1920 at most; the garden art goes to 2560)
const fullSrcset = (n) => (n.startsWith('rm_') ? [1280, 1920] : [1280, 1920, 2560]).map((w) => `${import.meta.env.BASE_URL}img/${n}-${w}.webp ${w}w`).join(', ')
const thumbSrc = (it) => (it.kind === 'video' ? it.poster : `${import.meta.env.BASE_URL}img/${it.src}-640.webp`)

function readItems() {
  items = [...document.querySelectorAll('[data-mosaic] .tile-btn')].map((b) => ({
    btn: b,
    kind: b.dataset.kind,
    src: b.dataset.src,
    poster: b.dataset.poster,
    caption: b.dataset.caption,
    alt: b.dataset.alt,
  }))
}

// --- the corridor ---------------------------------------------------------------------------------
// Scrolling down walks you along the wall: the section is as tall as the walk is long, its stage
// stays pinned, and the track slides by the distance you've scrolled. The pictures lean with your
// pace (a skew that eases off when you stop), their contents drift a little behind their frames,
// and the counter and the bar say where you are. A phone or reduced motion gets a row to swipe.
function initCorridor() {
  const section = document.querySelector('.gallery')
  const corridor = section.querySelector('[data-corridor]')
  const stage = corridor.querySelector('.corridor-stage')
  const track = corridor.querySelector('.corridor-track')
  const hangs = [...track.querySelectorAll('.hang')]
  const count = corridor.querySelector('[data-corridor-count]')
  const bar = corridor.querySelector('.corridor-bar')
  const swipe = matchMedia('(max-width: 800px), (pointer: coarse)')
  let dist = 0
  let lastX = 0
  let skew = 0
  let raf = 0
  let active = false
  let shown = -1

  const measure = () => {
    const isSwipe = swipe.matches || reducedMotion()
    section.classList.toggle('is-swipe', isSwipe)
    if (isSwipe) {
      corridor.style.height = ''
      track.style.removeProperty('--tx')
      return
    }
    dist = Math.max(0, track.scrollWidth - stage.clientWidth)
    corridor.style.height = `${dist + innerHeight}px`
    update()
  }

  const update = () => {
    raf = 0
    if (section.classList.contains('is-swipe')) return
    const top = corridor.getBoundingClientRect().top
    const p = Math.min(1, Math.max(0, -top / Math.max(1, dist)))
    const x = -p * dist
    // the lean: how fast the wall is moving, eased
    skew += (Math.max(-7, Math.min(7, (x - lastX) * 0.12)) - skew) * 0.2
    lastX = x
    track.style.setProperty('--tx', `${x.toFixed(1)}px`)
    bar.style.setProperty('--p', p.toFixed(4))
    const mid = innerWidth / 2
    let best = 0
    let bestD = Infinity
    hangs.forEach((h, i) => {
      const r = h.getBoundingClientRect()
      const c = r.left + r.width / 2
      const d = c - mid
      h.style.setProperty('--par', `${(-d * 0.05).toFixed(1)}px`)
      h.style.setProperty('--skew', `${skew.toFixed(2)}deg`)
      if (Math.abs(d) < bestD) {
        bestD = Math.abs(d)
        best = i
      }
    })
    if (best !== shown) {
      shown = best
      count.textContent = String(best + 1).padStart(2, '0')
    }
    // keep easing the lean back to straight after the scrolling stops
    if (Math.abs(skew) > 0.02 && active) raf = requestAnimationFrame(update)
  }
  const kick = () => {
    if (!raf && active) raf = requestAnimationFrame(update)
  }
  new IntersectionObserver(([e]) => {
    active = e.isIntersecting
    if (active) kick()
  }).observe(corridor)
  addEventListener('scroll', kick, { passive: true })
  addEventListener('resize', measure, { passive: true })
  swipe.addEventListener('change', measure)
  // (the images arrive after layout: measure again as they load)
  track.querySelectorAll('img').forEach((im) => im.complete || im.addEventListener('load', measure, { once: true }))
  measure()

  // moving paintings: the films play while they're on the wall in front of you
  const films = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target
      if (e.isIntersecting && !reducedMotion() && !navigator.connection?.saveData) {
        if (!v.src) {
          v.src = v.dataset.film
          v.addEventListener('playing', () => v.classList.add('is-on'), { once: true })
        }
        v.play().catch(() => {})
      } else if (v.src) v.pause()
    }
  }, { threshold: 0.35 })
  track.querySelectorAll('[data-film]').forEach((v) => films.observe(v))

  items.forEach((it, i) => it.btn.addEventListener('click', () => open(i)))
}

// --- the viewer -----------------------------------------------------------------------------------
function buildThumbs() {
  thumbs.innerHTML = items.map((it, i) => `<li><button type="button" data-i="${i}" aria-label="${it.caption}" data-stick><img src="${thumbSrc(it)}" alt="" loading="lazy" width="160" height="90"></button></li>`).join('')
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]')
    if (b) show(Number(b.dataset.i), Number(b.dataset.i) > index ? 1 : -1)
  })
}

function applyView() {
  if (!imgEl) return
  imgEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`
  lb.classList.toggle('is-zoomed', view.s > 1.01)
  zoomBtn.setAttribute('aria-pressed', String(view.s > 1.01))
  zoomBtn.setAttribute('aria-label', view.s > 1.01 ? 'Zoom out' : 'Zoom in')
}

// keep the zoomed still covering its box: no panning off into the dark
function clampView() {
  const w = imgEl.offsetWidth
  const h = imgEl.offsetHeight
  view.s = Math.min(4, Math.max(1, view.s))
  view.x = Math.min(0, Math.max(w - w * view.s, view.x))
  view.y = Math.min(0, Math.max(h - h * view.s, view.y))
}

/** Zooms to scale s, keeping the point (cx, cy) (client px) where it is. */
function zoomAt(s, cx, cy, animate = true) {
  if (!imgEl) return
  const r = imgEl.getBoundingClientRect()
  // the point in the still's own (unscaled) pixels
  const px = (cx - r.left) / view.s
  const py = (cy - r.top) / view.s
  const base = r.left - view.x
  const baseY = r.top - view.y
  view.s = s
  view.x = cx - base - px * s
  view.y = cy - baseY - py * s
  clampView()
  imgEl.style.transition = animate && !reducedMotion() ? 'transform .45s cubic-bezier(.16,1,.3,1)' : 'none'
  applyView()
}

function resetView(animate = true) {
  view = { s: 1, x: 0, y: 0 }
  if (imgEl) imgEl.style.transition = animate ? 'transform .45s cubic-bezier(.16,1,.3,1)' : 'none'
  applyView()
}

function mediaFor(it) {
  const wrap = document.createElement('div')
  wrap.className = 'lb-media'
  if (it.kind === 'video') {
    player = createPlayer({ src: it.src, poster: it.poster, label: it.caption, autoplay: true })
    wrap.append(player.el)
    imgEl = null
  } else {
    const img = document.createElement('img')
    img.className = 'lb-img'
    img.alt = it.alt
    img.width = 2560
    img.height = 1421
    img.sizes = '100vw'
    img.srcset = fullSrcset(it.src)
    img.src = `${import.meta.env.BASE_URL}img/${it.src}-1920.webp`
    img.draggable = false
    img.dataset.cursor = 'closer'
    wrap.append(img)
    imgEl = img
    view = { s: 1, x: 0, y: 0 }
  }
  return wrap
}

function show(i, dir = 0) {
  index = (i + items.length) % items.length
  const it = items[index]
  if (player) {
    player.destroy()
    player = null
  }
  const media = mediaFor(it)
  if (dir && !reducedMotion()) {
    media.style.setProperty('--from', `${dir * 60}px`)
    media.classList.add('lb-swap-in')
  }
  stage.replaceChildren(media)
  count.innerHTML = `<b>${index + 1}</b> of ${items.length}`
  cap.textContent = it.caption
  zoomBtn.hidden = it.kind === 'video'
  thumbs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', String(k === index)))
  thumbs.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
  // the neighbours' stills, fetched ahead
  for (const d of [1, -1]) {
    const n = items[(index + d + items.length) % items.length]
    if (n.kind === 'image') {
      const pre = new Image()
      pre.sizes = '100vw'
      pre.srcset = fullSrcset(n.src)
    }
  }
  return media
}

function open(i) {
  opener = items[i].btn
  cursorHost(lb)
  lb.showModal()
  const media = show(i)
  // grow out of the tile: from its rectangle to the viewer's
  if (!reducedMotion()) {
    const from = opener.getBoundingClientRect()
    const target = media.firstElementChild
    const go = () => {
      const to = target.getBoundingClientRect()
      if (!to.width) return
      target.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, transformOrigin: '0 0', borderRadius: '8px' },
        { transform: 'none', transformOrigin: '0 0' },
      ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' })
    }
    if (target.tagName === 'IMG' && !target.complete) {
      target.style.opacity = '0'
      target.addEventListener('load', () => {
        target.style.opacity = ''
        go()
      }, { once: true })
    } else go()
  }
  history.replaceState(null, '', '#garden')
}

function close() {
  if (!lb.open || lb.classList.contains('is-closing')) return
  const done = () => {
    lb.classList.remove('is-closing')
    lb.close()
  }
  if (reducedMotion()) done()
  else {
    lb.classList.add('is-closing')
    setTimeout(done, 280)
  }
}

function initViewer() {
  buildThumbs()
  lb.querySelector('[data-lb-close]').addEventListener('click', close)
  lb.querySelector('[data-lb-prev]').addEventListener('click', () => show(index - 1, -1))
  lb.querySelector('[data-lb-next]').addEventListener('click', () => show(index + 1, 1))
  zoomBtn.addEventListener('click', () => {
    if (!imgEl) return
    const r = imgEl.getBoundingClientRect()
    if (view.s > 1.01) resetView()
    else zoomAt(2.2, r.left + r.width / 2, r.top + r.height / 2)
  })
  lb.addEventListener('close', () => {
    if (player) {
      player.destroy()
      player = null
    }
    stage.replaceChildren()
    imgEl = null
    cursorHost(null)
    opener?.focus({ preventScroll: true })
  })
  lb.addEventListener('cancel', (e) => {
    e.preventDefault()
    close()
  })
  // a click on the dark around the picture closes
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target === stage) close()
  })
  lb.addEventListener('keydown', (e) => {
    if (e.target.closest('.pl') && ['ArrowLeft', 'ArrowRight'].includes(e.key) && e.target.closest('.pl-scrub')) return
    if (e.key === 'ArrowRight') show(index + 1, 1)
    else if (e.key === 'ArrowLeft') show(index - 1, -1)
    else if (e.key === 'Home') show(0, -1)
    else if (e.key === 'End') show(items.length - 1, 1)
    else if ((e.key === '+' || e.key === '=') && imgEl) zoomBtn.click()
    else if (e.key === '-' && imgEl) resetView()
    else if (e.key === '0' && imgEl) resetView()
    else return
    e.preventDefault()
  })

  // stills: click to zoom where you clicked, wheel to zoom, drag to pan; touch: swipe, double-tap
  let drag = null
  let lastTap = 0
  stage.addEventListener('wheel', (e) => {
    if (!imgEl) return
    e.preventDefault()
    zoomAt(view.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY, false)
  }, { passive: false })
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pl') || e.button !== 0) return
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, id: e.pointerId, type: e.pointerType }
    try {
      stage.setPointerCapture(e.pointerId)
    } catch {
      /* (a pointer that is already gone) */
    }
  })
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true
    if (imgEl && view.s > 1.01) {
      view.x = drag.vx + dx
      view.y = drag.vy + dy
      clampView()
      imgEl.style.transition = 'none'
      applyView()
    } else if (drag.moved) {
      // the swipe, followed by the picture
      stage.firstElementChild?.style.setProperty('translate', `${dx * 0.6}px 0`)
    }
  })
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return
    const dx = e.clientX - drag.x
    const media = stage.firstElementChild
    media?.style.removeProperty('translate')
    if (drag.moved && view.s <= 1.01 && Math.abs(dx) > 60) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
    else if (!drag.moved && imgEl && e.target === imgEl) {
      const now = performance.now()
      const dbl = drag.type !== 'mouse' && now - lastTap < 320
      lastTap = now
      if (drag.type === 'mouse' || dbl) {
        if (view.s > 1.01) resetView()
        else zoomAt(2.4, e.clientX, e.clientY)
      }
    } else if (!drag.moved && e.target === stage) close()
    drag = null
  }
  stage.addEventListener('pointerup', end)
  stage.addEventListener('pointercancel', end)
  addEventListener('resize', () => lb.open && resetView(false), { passive: true })
}

export function openGallery(i = 0) {
  open(i)
}

let ready = false
export function initGallery() {
  if (ready) return
  ready = true
  if (!lb || !document.querySelector('[data-mosaic]')) return
  readItems()
  initCorridor()
  initViewer()
}
