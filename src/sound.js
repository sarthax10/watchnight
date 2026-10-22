// Sound, off by default: rain at the window and the fire in the hearth, looped, faded in and out.
// The files are fetched only when someone turns it on. Browsers start audio only after a gesture,
// so a remembered "on" waits for the first click or key.
import { prefs, setPref, relabel } from './lib.js'

const root = document.documentElement
let loops = null

function make(src, vol) {
  const a = new Audio(src)
  a.loop = true
  a.preload = 'auto'
  a.volume = 0
  a.dataset.vol = vol
  return a
}

function fade(a, to, ms = 900) {
  const from = a.volume
  const t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms)
    a.volume = from + (to - from) * k
    if (k < 1) requestAnimationFrame(step)
    else if (to === 0) a.pause()
  }
  requestAnimationFrame(step)
}

function start() {
  if (!loops) loops = [make(import.meta.env.BASE_URL + 'audio/rain.m4a', 0.35), make(import.meta.env.BASE_URL + 'audio/fire.m4a', 0.22)]
  for (const a of loops) {
    a.play().then(() => fade(a, Number(a.dataset.vol))).catch(() => {})
  }
}

function stop() {
  if (loops) for (const a of loops) fade(a, 0, 600)
}

export function setSound(on) {
  root.classList.toggle('sound-on', on)
  document.querySelectorAll('[data-sound]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on))
    if (b.classList.contains('linkish')) relabel(b, on ? 'Turn the sound off' : 'Turn the sound on')
  })
  setPref('sound', on)
  on ? start() : stop()
}

export function thunder() {
  if (!root.classList.contains('sound-on')) return
  const t = new Audio(import.meta.env.BASE_URL + 'audio/thunder.m4a')
  t.volume = 0.5
  t.play().catch(() => {})
}

export function initSound() {
  document.querySelectorAll('[data-sound]').forEach((b) => b.addEventListener('click', () => setSound(!root.classList.contains('sound-on'))))
  addEventListener('wn:toggle-sound', () => setSound(!root.classList.contains('sound-on')))
  if (prefs().sound) {
    // remembered: waits for the first gesture
    root.classList.add('sound-on')
    document.querySelectorAll('[data-sound]').forEach((b) => b.setAttribute('aria-pressed', 'true'))
    const once = () => {
      removeEventListener('pointerdown', once)
      removeEventListener('keydown', once)
      if (root.classList.contains('sound-on')) start()
    }
    addEventListener('pointerdown', once)
    addEventListener('keydown', once)
  }
}
