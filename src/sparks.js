// A click throws embers: a small burst that rises, cools from gold to red and falls. The canvas is
// sized on first use; the loop runs only while embers are alive.
import { reducedMotion, lightsOn } from './lib.js'

const canvas = document.querySelector('[data-sparks]')
let ctx = null
let embers = []
let running = false
let dpr = 1

function size() {
  dpr = Math.min(devicePixelRatio || 1, 1.5)
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  embers = embers.filter((p) => p.life > 0)
  for (const p of embers) {
    p.vy += 0.045
    p.vx *= 0.985
    p.x += p.vx
    p.y += p.vy
    p.life -= 1
    const k = p.life / p.max
    const hue = 22 + 26 * k
    ctx.fillStyle = `hsla(${hue}, 95%, ${48 + 30 * k}%, ${Math.min(1, k * 1.6)})`
    const s = p.size * (0.4 + 0.6 * k) * dpr
    ctx.fillRect(p.x * dpr, p.y * dpr, s, s)
  }
  if (embers.length) requestAnimationFrame(loop)
  else {
    running = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

export function burst(x, y, n = 18) {
  if (reducedMotion() || lightsOn()) return
  if (!ctx) {
    ctx = canvas.getContext('2d')
    size()
    addEventListener('resize', size, { passive: true })
  }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
    const v = 1.2 + Math.random() * 3.2
    const max = 30 + Math.random() * 34
    embers.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.5 + Math.random() * 2.5 })
  }
  if (!running) {
    running = true
    requestAnimationFrame(loop)
  }
}

export function initSparks() {
  addEventListener('pointerdown', (e) => {
    // (the candle cursor throws its own embers)
    if (e.button !== 0 || e.target.closest('input, textarea') || document.documentElement.classList.contains('has-cursor')) return
    burst(e.clientX, e.clientY)
  }, { passive: true })
}
