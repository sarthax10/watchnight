// Small shared helpers: preferences (localStorage, guarded: private windows can refuse it), the
// visitor's motion and pointer settings, a toast, and yielding to the main thread.

const KEY = 'wn:prefs'
let cache = null

export function prefs() {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    cache = {}
  }
  return cache
}

export function setPref(key, value) {
  prefs()[key] = value
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage refused: the choice lasts for this visit only */
  }
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => matchMedia('(pointer: fine)').matches
export const lightsOn = () => document.documentElement.classList.contains('lights')

let toastTimer = 0
export function toast(text) {
  const el = document.querySelector('[data-toast]')
  if (!el) return
  el.textContent = text
  el.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200)
}

export function idle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 })
  else setTimeout(fn, 200)
}

export async function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) return scheduler.yield()
  return new Promise((r) => setTimeout(r, 0))
}

/** Runs fn once el is near the viewport (for work nobody needs before they scroll there). */
export function whenNear(el, fn, margin = '400px') {
  if (!el) return
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect()
      fn()
    }
  }, { rootMargin: margin })
  io.observe(el)
}

/** Changes a control's words, rolled ([data-roll]) or plain. */
export function relabel(el, text) {
  const roll = el.querySelectorAll('.roll > span')
  if (roll.length) roll.forEach((s) => (s.textContent = text))
  else el.textContent = text
  if (el.hasAttribute('aria-label') && el.classList.contains('linkish')) el.setAttribute('aria-label', text)
}
