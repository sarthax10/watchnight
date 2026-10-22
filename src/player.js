// The film player: the browser's <video> with the site's own controls. A large play button; a bar
// with play/pause, the time, a scrubber (what has loaded, what has played, a knob, the time under
// your pointer; drag it, or use the arrow keys on it), sound and volume, and full screen. The bar
// steps aside while the film plays and you leave it alone.
// Keys (while the player has focus): Space or K plays and pauses, J and L skip 5 s, M mutes, F fills
// the screen.

const ICON = {
  play: '<svg class="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  sound: '<svg class="i-sound" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  muted: '<svg class="i-muted" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6m0-6l-5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/** Builds a player for src (with a poster) and returns { el, play, pause, destroy }. */
export function createPlayer({ src, poster, label, autoplay = false }) {
  const el = document.createElement('div')
  el.className = 'pl'
  el.tabIndex = 0
  el.setAttribute('role', 'group')
  el.setAttribute('aria-label', `Film: ${label}`)
  el.innerHTML = `
    <video playsinline loop preload="metadata" poster="${poster}" src="${src}"></video>
    <button class="pl-big" type="button" aria-label="Play" data-cursor="play">${ICON.play}</button>
    <div class="pl-bar">
      <button class="pl-b" type="button" data-act="play" aria-label="Play">${ICON.play}${ICON.pause}</button>
      <span class="pl-time" aria-live="off"><span data-cur>0:00</span> / <span data-dur>0:00</span></span>
      <div class="pl-scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
        <div class="pl-track"><i class="pl-buf"></i><i class="pl-done"></i><i class="pl-knob"></i></div>
        <span class="pl-tip">0:00</span>
      </div>
      <button class="pl-b" type="button" data-act="mute" aria-label="Mute">${ICON.sound}${ICON.muted}</button>
      <input class="pl-vol" type="range" min="0" max="1" step="0.05" value="0.8" aria-label="Volume">
      <button class="pl-b" type="button" data-act="full" aria-label="Full screen">${ICON.full}</button>
    </div>`
  const v = el.querySelector('video')
  const scrub = el.querySelector('.pl-scrub')
  const cur = el.querySelector('[data-cur]')
  const dur = el.querySelector('[data-dur]')
  const tip = el.querySelector('.pl-tip')
  const playBtn = el.querySelector('[data-act="play"]')
  const vol = el.querySelector('.pl-vol')
  v.volume = 0.8

  const sync = () => {
    const d = v.duration || 0
    const k = d ? v.currentTime / d : 0
    el.style.setProperty('--done', `${k * 100}%`)
    cur.textContent = fmt(v.currentTime)
    scrub.setAttribute('aria-valuenow', Math.round(v.currentTime))
    scrub.setAttribute('aria-valuetext', `${fmt(v.currentTime)} of ${fmt(d)}`)
  }
  const buffered = () => {
    const d = v.duration || 0
    if (!d || !v.buffered.length) return
    el.style.setProperty('--buf', `${(v.buffered.end(v.buffered.length - 1) / d) * 100}%`)
  }
  const state = () => {
    const playing = !v.paused && !v.ended
    el.classList.toggle('is-playing', playing)
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    el.classList.toggle('is-muted', v.muted || v.volume === 0)
    el.querySelector('[data-act="mute"]').setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute')
    if (!playing) el.classList.remove('is-idle')
  }
  v.addEventListener('loadedmetadata', () => {
    dur.textContent = fmt(v.duration)
    scrub.setAttribute('aria-valuemax', Math.round(v.duration))
    sync()
  })
  v.addEventListener('timeupdate', sync)
  v.addEventListener('progress', buffered)
  v.addEventListener('play', state)
  v.addEventListener('pause', state)
  v.addEventListener('ended', state)
  v.addEventListener('volumechange', () => {
    state()
    vol.value = v.muted ? 0 : v.volume
  })

  const toggle = () => (v.paused || v.ended ? v.play().catch(() => {}) : v.pause())
  const seekBy = (s) => {
    v.currentTime = Math.min(v.duration || 0, Math.max(0, v.currentTime + s))
  }
  const full = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else (el.requestFullscreen ? el.requestFullscreen() : v.webkitEnterFullscreen?.())?.catch?.(() => {})
  }
  el.querySelector('.pl-big').addEventListener('click', toggle)
  playBtn.addEventListener('click', toggle)
  v.addEventListener('click', toggle)
  v.addEventListener('dblclick', full)
  el.querySelector('[data-act="mute"]').addEventListener('click', () => (v.muted = !v.muted))
  el.querySelector('[data-act="full"]').addEventListener('click', full)
  vol.addEventListener('input', () => {
    v.volume = Number(vol.value)
    v.muted = v.volume === 0
  })

  // the scrubber: pointer drag, a time under the pointer, arrow keys
  const at = (e) => {
    const r = scrub.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  }
  scrub.addEventListener('pointermove', (e) => {
    const k = at(e)
    el.style.setProperty('--tip', `${k * 100}%`)
    tip.textContent = fmt(k * (v.duration || 0))
  })
  scrub.addEventListener('pointerdown', (e) => {
    scrub.setPointerCapture(e.pointerId)
    scrub.classList.add('is-drag')
    const was = !v.paused
    v.pause()
    const go = (ev) => {
      const k = at(ev)
      v.currentTime = k * (v.duration || 0)
      el.style.setProperty('--tip', `${k * 100}%`)
      tip.textContent = fmt(v.currentTime)
      sync()
    }
    go(e)
    const up = () => {
      scrub.classList.remove('is-drag')
      scrub.removeEventListener('pointermove', go)
      if (was) v.play().catch(() => {})
    }
    scrub.addEventListener('pointermove', go)
    scrub.addEventListener('pointerup', up, { once: true })
    scrub.addEventListener('pointercancel', up, { once: true })
  })
  scrub.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') seekBy(2)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') seekBy(-2)
    else if (e.key === 'Home') v.currentTime = 0
    else if (e.key === 'End') v.currentTime = v.duration || 0
    else return
    e.preventDefault()
    e.stopPropagation()
  })

  el.addEventListener('keydown', (e) => {
    if (e.target === vol) return
    const k = e.key.toLowerCase()
    if (k === ' ' || k === 'k') {
      if (e.target.tagName === 'BUTTON' && k === ' ') return
      toggle()
    } else if (k === 'j') seekBy(-5)
    else if (k === 'l') seekBy(5)
    else if (k === 'm') v.muted = !v.muted
    else if (k === 'f') full()
    else return
    e.preventDefault()
  })

  // the bar steps aside while the film plays untouched
  let idle = 0
  const wake = () => {
    el.classList.remove('is-idle')
    clearTimeout(idle)
    idle = setTimeout(() => !v.paused && el.classList.add('is-idle'), 2200)
  }
  el.addEventListener('pointermove', wake)
  el.addEventListener('keydown', wake)
  v.addEventListener('play', wake)

  if (autoplay) v.play().catch(() => {})
  return {
    el,
    play: () => v.play().catch(() => {}),
    pause: () => v.pause(),
    destroy: () => {
      clearTimeout(idle)
      v.pause()
      v.removeAttribute('src')
      v.load()
    },
  }
}
