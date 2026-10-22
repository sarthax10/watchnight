// The house log and the visitors' tallies, from /data/*.json (the service worker serves them stale
// while it fetches fresh ones) and Discord's public invite counts, read live.
import { saveSnapshot, snapshots } from './store.js'
import { reducedMotion } from './lib.js'
import { onEnter } from './reveal.js'

const INVITE = '3RhgvRMb9R'
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
const numFmt = new Intl.NumberFormat('en-GB')

const day = (iso) => dateFmt.format(new Date(`${iso}T12:00:00`))

// --- the log -----------------------------------------------------------------------------------------
export async function initLog() {
  const list = document.querySelector('[data-log]')
  if (!list) return
  let data
  try {
    data = await (await fetch(import.meta.env.BASE_URL + 'data/progress.json')).json()
  } catch {
    list.innerHTML = '<li class="entry"><p>The log is on <a href="https://sarthax10.itch.io/watchnight/devlog">itch.io</a>.</p></li>'
    return
  }
  if (data.commits) {
    document.querySelector('[data-log-intro]').textContent = `Made in the open: ${numFmt.format(data.commits)} changes since ${day(data.started)}. Every night the house gets a little stranger.`
  }
  const items = [...data.milestones].reverse()
  list.innerHTML = items.map((m) => `
    <li class="entry${m.version ? ' is-release' : ''}">
      <time datetime="${m.date}">${day(m.date)}</time>
      <div class="entry-body">
        <h3>${m.title}${m.version ? `<small>playable</small>` : ''}</h3>
        <ul>${m.points.map((p) => `<li>${p}</li>`).join('')}</ul>
      </div>
    </li>`).join('')
  onEnter(list.querySelectorAll('.entry'))
  if (data.next) {
    document.querySelector('[data-next]').innerHTML = `<h3>Next: playtest ${data.next.version}</h3><ul>${data.next.points.map((p) => `<li>${p}</li>`).join('')}</ul>`
  }
}

// --- the tallies -------------------------------------------------------------------------------------
function odometer(value) {
  const s = numFmt.format(value)
  const wrap = document.createElement('span')
  wrap.className = 'count'
  wrap.setAttribute('aria-hidden', 'true')
  for (const ch of s) {
    const d = document.createElement('span')
    d.className = 'digit'
    if (/\d/.test(ch)) {
      const col = document.createElement('span')
      col.textContent = '0123456789'.split('').join('\n')
      col.style.whiteSpace = 'pre'
      col.style.lineHeight = '1'
      col.dataset.to = ch
      d.append(col)
    } else d.textContent = ch
    wrap.append(d)
  }
  return wrap
}

function roll(wrap) {
  wrap.querySelectorAll('[data-to]').forEach((col, i) => {
    col.style.transitionDelay = `${i * 70}ms`
    col.style.transform = `translateY(-${Number(col.dataset.to)}em)`
  })
}

function sparkline(points) {
  const vals = points.filter((v) => typeof v === 'number')
  if (vals.length < 2) return ''
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const span = max - min || 1
  const step = 144 / (vals.length - 1)
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(30 - ((v - min) / span) * 26).toFixed(1)}`).join(' ')
  return `<svg class="spark" viewBox="0 0 144 32" aria-hidden="true"><path d="${d}"/></svg>`
}

async function discord() {
  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${INVITE}?with_counts=true`)
    const j = await r.json()
    return { members: j.approximate_member_count, online: j.approximate_presence_count }
  } catch {
    return null
  }
}

// --- (WN-76) the guest book: a real count of everyone who has come to the site -----------------------
// The count is kept by our own server (tools/manor-pass, the Ledger): a browser signs once, the first
// time it comes, and remembers its line number here. No cookies, nothing about the visitor is kept.
const BOOK = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8787' : 'https://watchnight-manor-pass.watchnight.workers.dev'

async function guestBook() {
  let line = null
  try {
    line = localStorage.getItem('wn:signed')
  } catch {
    /* private window: counted as new each time is wrong; then only read */
    line = 'private'
  }
  try {
    if (line == null) {
      const r = await fetch(`${BOOK}/visit`, { method: 'POST' })
      const j = await r.json()
      if (j.visitors != null) {
        try {
          // (signed: your line; or, when your address had signed too often today, just "seen")
          localStorage.setItem('wn:signed', j.number ? String(j.number) : 'seen')
        } catch {
          /* fine */
        }
      }
      return { visitors: j.visitors, line: j.number, fresh: true }
    }
    const j = await (await fetch(`${BOOK}/visits`)).json()
    const n = Number(line)
    return { visitors: j.visitors, line: Number.isFinite(n) && n > 0 ? n : null, fresh: false }
  } catch {
    return null
  }
}

export async function initBook() {
  const fig = document.querySelector('[data-book]')
  if (!fig) return
  const b = await guestBook()
  if (!b || !b.visitors) return
  const count = odometer(b.visitors)
  const box = fig.querySelector('[data-book-count]')
  box.append(count)
  box.insertAdjacentHTML('beforeend', `<span class="visually-hidden">${numFmt.format(b.visitors)} ${b.visitors === 1 ? 'person' : 'people'}</span>`)
  if (b.line) {
    fig.querySelector('[data-book-sig]').textContent = numFmt.format(b.line)
    fig.querySelector('[data-book-you]').hidden = false
  }
  if (b.visitors === 1) fig.querySelector('.book-line').textContent = 'has come up the drive and signed it.'
  fig.hidden = false
  const go = () => {
    roll(count)
    fig.classList.add('is-in')
    if (b.fresh && b.line) fig.classList.add('is-new')          // the pen writes your line in
  }
  if (reducedMotion()) return go()
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      go()
      io.disconnect()
    }
  }, { threshold: 0.5 })
  io.observe(fig)
}

export async function initTally() {
  const list = document.querySelector('[data-tally]')
  if (!list) return
  const [stats, dc, local] = await Promise.all([
    fetch(import.meta.env.BASE_URL + 'data/stats.json').then((r) => r.json()).catch(() => null),
    discord(),
    snapshots(),
  ])
  const n = stats?.numbers || {}
  const hist = stats?.history || []
  const rows = []
  if (dc?.members != null) {
    saveSnapshot({ discord: dc.members })
    rows.push({ value: dc.members, label: 'people in the Discord', link: ['Join them', 'https://discord.gg/3RhgvRMb9R'], live: `${numFmt.format(dc.online)} online now`, series: local.map((s) => s.discord) })
  }
  if (n.youtube_views?.value) rows.push({ value: n.youtube_views.value, label: 'views on YouTube', link: ['Watch', 'https://www.youtube.com/@WatchnightGame'], series: hist.map((h) => h.youtube_views) })
  if (n.instagram_plays?.value) rows.push({ value: n.instagram_plays.value, label: 'plays on Instagram', link: ['Follow', 'https://www.instagram.com/watchnightgame/'], series: hist.map((h) => h.instagram_plays) })
  if (n.itch_downloads?.value) rows.push({ value: n.itch_downloads.value, label: 'downloads on itch.io', link: ['Download', 'https://sarthax10.itch.io/watchnight'], series: hist.map((h) => h.itch_downloads) })
  if (!rows.length) {
    list.innerHTML = '<li><p>The numbers are resting. Visit the <a href="https://discord.gg/3RhgvRMb9R">Discord</a> to see who\'s in.</p></li>'
    return
  }
  list.textContent = ''
  for (const row of rows) {
    const li = document.createElement('li')
    const counter = odometer(row.value)
    li.append(counter)
    li.insertAdjacentHTML('beforeend', `
      <span class="visually-hidden">${numFmt.format(row.value)}</span>
      <p class="tally-label">${row.label}. <a href="${row.link[1]}" rel="noopener">${row.link[0]}</a></p>
      ${row.live ? `<p class="tally-live">${row.live}</p>` : ''}
      ${sparkline(row.series || [])}`)
    list.append(li)
  }
  if (stats?.updated) {
    document.querySelector('[data-updated]').textContent = `Counted ${day(stats.updated.slice(0, 10))}${dc ? '; the Discord count is live' : ''}.`
  }
  onEnter(list.children, { margin: '0px 0px -20% 0px' })
  const counters = [...list.querySelectorAll('.count')]
  if (reducedMotion()) return counters.forEach(roll)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        roll(e.target)
        io.unobserve(e.target)
      }
    }
  }, { threshold: 0.6 })
  counters.forEach((c) => io.observe(c))
}
