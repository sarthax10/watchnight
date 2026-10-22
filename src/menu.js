// The house menu: right-click (or the context-menu key) opens it where you are, styled like the
// game's own pause menu. Shift + right-click, and right-clicks in text fields, keep the browser's.
// Keyboard: arrows move, Home/End jump, Escape or Tab closes and returns focus.
import { toast } from './lib.js'

const menu = document.querySelector('[data-hmenu]')
const items = () => [...menu.querySelectorAll('[role="menuitem"]')]
let opener = null

function open(x, y) {
  opener = document.activeElement
  menu.hidden = false
  const w = menu.offsetWidth
  const h = menu.offsetHeight
  const left = Math.min(x, innerWidth - w - 8)
  const top = Math.min(y, innerHeight - h - 8)
  menu.style.left = `${Math.max(8, left)}px`
  menu.style.top = `${Math.max(8, top)}px`
  menu.style.setProperty('--ox', `${x - left}px`)
  menu.style.setProperty('--oy', `${y - top}px`)
  refreshLabels()
  items()[0].focus({ preventScroll: true })
}

function close(restore = true) {
  if (menu.hidden) return
  menu.hidden = true
  if (restore && opener && opener.focus) opener.focus({ preventScroll: true })
}

function refreshLabels() {
  const root = document.documentElement
  menu.querySelector('[data-act="lights"]').textContent = root.classList.contains('lights') ? 'Put the lights out' : 'Turn the lights on'
  menu.querySelector('[data-act="sound"]').textContent = root.classList.contains('sound-on') ? 'Turn the sound off' : 'Turn the sound on'
}

export function initMenu() {
  addEventListener('contextmenu', (e) => {
    if (document.querySelector('dialog[open]')) return // (the viewer keeps the browser's menu)
    if (e.shiftKey || e.target.closest('input, textarea, [contenteditable]')) return
    e.preventDefault()
    // (the keyboard's context-menu key reports 0,0: open by the focused element instead)
    let x = e.clientX
    let y = e.clientY
    if (!x && !y && document.activeElement) {
      const r = document.activeElement.getBoundingClientRect()
      x = r.left + 10
      y = r.bottom + 4
    }
    open(x, y)
  })
  addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target)) close(false)
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) close()
  })
  addEventListener('scroll', () => close(false), { passive: true })
  addEventListener('blur', () => close(false))
  menu.addEventListener('keydown', (e) => {
    const list = items()
    const i = list.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') list[(i + 1) % list.length].focus()
    else if (e.key === 'ArrowUp') list[(i - 1 + list.length) % list.length].focus()
    else if (e.key === 'Home') list[0].focus()
    else if (e.key === 'End') list[list.length - 1].focus()
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') close()
    else return
    e.preventDefault()
  })
  menu.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act
    if (act === 'copy') {
      try {
        await navigator.clipboard.writeText(location.href.split('#')[0])
        toast('Link copied')
      } catch {
        toast('Copy the address from the address bar')
      }
    } else if (act === 'lights') dispatchEvent(new CustomEvent('wn:toggle-lights'))
    else if (act === 'sound') dispatchEvent(new CustomEvent('wn:toggle-sound'))
    else if (act === 'top') scrollTo({ top: 0 })
    else if (act === 'gallery') dispatchEvent(new CustomEvent('wn:open-gallery'))
    close(act !== 'top' && act !== 'gallery')
  })
}
