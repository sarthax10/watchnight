// Watchnight — the site. Everything above the fold is plain HTML and CSS; this file wakes the
// effects in order of need: the opening, the cursor and the hero first, the rest when the browser is
// idle or when their section comes near.
import './styles.css'
import { prefs, setPref, idle, whenNear, toast, relabel } from './lib.js'
import { initCursor } from './cursor.js'
import { initSparks } from './sparks.js'
import { initMenu } from './menu.js'
import { initSteal } from './steal.js'
import { intro, initTilt, initRain, initMotes, initEyes } from './hero.js'
import { initSound } from './sound.js'
import { initGuests } from './guests.js'
import { initCycle } from './cycle.js'
import { initLog, initTally } from './data.js'
import { initMagnets, initBar } from './touch.js'
import { initHeadings, initRoll, initStatement, initRibbon, initNav, initAbout, initFoot, initLastFilm } from './reveal.js'
import { initGallery, openGallery } from './gallery.js'

const root = document.documentElement

// "lights on": no dark, no rain (remembered)
function setLights(on) {
  root.classList.toggle('lights', on)
  document.querySelectorAll('[data-lights]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on))
    if (b.classList.contains('linkish')) relabel(b, on ? 'Put the lights out' : 'Turn the lights on')
  })
  setPref('lights', on)
  dispatchEvent(new CustomEvent('wn:lights'))
}
document.querySelectorAll('[data-lights]').forEach((b) => b.addEventListener('click', () => {
  setLights(!root.classList.contains('lights'))
  toast(root.classList.contains('lights') ? 'Lights on' : 'Lights out')
}))
addEventListener('wn:toggle-lights', () => setLights(!root.classList.contains('lights')))

initRoll()
initSteal()
intro()
initCursor()
initSparks()
initMenu()
initSound()
initBar()
initEyes()
initHeadings()
if (prefs().lights) setLights(true)

idle(() => {
  initTilt()
  initRain()
  initMotes()
  initMagnets()
  initRibbon()
  initNav()
  initStatement()
})
whenNear(document.querySelector('.about'), initAbout, '600px')
whenNear(document.querySelector('.cycle'), initCycle, '600px')
whenNear(document.querySelector('[data-guests]'), initGuests, '800px')
whenNear(document.querySelector('[data-mosaic]'), initGallery, '900px')
whenNear(document.querySelector('[data-log]'), initLog, '900px')
whenNear(document.querySelector('[data-tally]'), initTally, '900px')
whenNear(document.querySelector('[data-foot]'), initFoot, '600px')
whenNear(document.querySelector('.last'), initLastFilm, '800px')
addEventListener('wn:open-gallery', () => {
  initGallery()
  document.querySelector('#garden').scrollIntoView()
  openGallery(0)
})

// the service worker: the house stays open offline, and comes back instantly
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
