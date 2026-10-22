// The guests: the game's own pixel portraits in a lineup of tall panels; the one you look at opens
// and shows who they are. One of them isn't human tonight (chosen at random each visit): accuse the
// one you'd vote out. The tell is fair, and the game's own: now and then, for a blink, its eyes burn
// red. Your record (nights played, found, streak) is kept in this browser.
import { prefs, setPref, toast, reducedMotion } from './lib.js'

const GUESTS = [
  { id: 'ruth', name: 'Ruth', note: 'A mustard cardigan and a knit scarf. Keeps the kitchen garden.' },
  { id: 'marcus', name: 'Marcus', note: 'A letterman jacket, Walkman headphones. Always somewhere else.' },
  { id: 'dana', name: 'Dana', note: 'A two-tone windbreaker and a sweatband. Up before anyone.' },
  { id: 'walt', name: 'Walt', note: 'A sweater vest, a necktie. Winds every clock in the house.' },
  { id: 'lena', name: 'Lena', note: 'A rose sweater and a hair bow. Cooks for the table.' },
  { id: 'tomas', name: 'Tomas', note: 'A leather jacket and a red cap. Keeps the fires.' },
  { id: 'ivy', name: 'Ivy', note: 'A denim jacket and a satchel. Reads in the library till late.' },
  { id: 'gus', name: 'Gus', note: 'A green work jacket, a watch cap. Digs the graves.' },
]

let it = 0
let cards = []
let tellTimer = 0
let seen = false
let watching = false

function pickIt() {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  it = a[0] % GUESTS.length
}

function render(list) {
  list.textContent = ''
  cards = GUESTS.map((g, i) => {
    const li = document.createElement('li')
    li.className = 'suspect'
    li.innerHTML = `
      <button class="suspect-btn" type="button" data-cursor="accuse" aria-label="Accuse ${g.name}. ${g.note}">
        <span class="portrait" aria-hidden="true">
          <img src="${import.meta.env.BASE_URL}img/guests/${g.id}.png" alt="" width="28" height="34" loading="lazy">
          <img class="eyes-l" src="${import.meta.env.BASE_URL}img/guests/${g.id}_eyes.png" alt="" width="28" height="34" loading="lazy">
        </span>
        <span class="suspect-name" aria-hidden="true">${g.name}</span>
        <span class="suspect-info" aria-hidden="true">
          <strong>${g.name}</strong>
          <span>${g.note}</span>
          <em>Accuse ${g.name}</em>
        </span>
      </button>`
    li.querySelector('button').addEventListener('click', () => choose(i))
    list.append(li)
    return li
  })
}

// the tell: a blink of red in its eyes, at odd moments, only while the lineup is on screen
function startTell(section) {
  clearTimeout(tellTimer)
  if (!watching) {
    watching = true
    new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(section)
  }
  const go = () => {
    if (seen && !document.hidden && !section.classList.contains('is-done')) {
      const card = cards[it]
      card.classList.add('is-tell')
      setTimeout(() => card.classList.remove('is-tell'), reducedMotion() ? 400 : 160)
    }
    tellTimer = setTimeout(go, 3500 + Math.random() * 5500)
  }
  tellTimer = setTimeout(go, 2500)
}

function record(found) {
  const r = prefs().guests || { played: 0, found: 0, streak: 0, best: 0 }
  r.played += 1
  if (found) {
    r.found += 1
    r.streak += 1
    r.best = Math.max(r.best, r.streak)
  } else r.streak = 0
  setPref('guests', r)
  return r
}

function choose(i) {
  const section = document.querySelector('.guests')
  if (section.classList.contains('is-done')) return
  section.classList.add('is-done')
  const g = GUESTS[i]
  const thing = GUESTS[it]
  const found = i === it
  cards[it].classList.add('is-it')
  if (!found) cards[i].classList.add('is-wrong')
  const verdict = document.querySelector('[data-verdict]')
  verdict.innerHTML = found
    ? `You found it. <span class="it">It was wearing ${thing.name}'s face.</span> Did you catch its eyes?`
    : `${g.name} was innocent, and now ${g.name} is gone. <span class="it">The thing was wearing ${thing.name}'s face.</span> Its eyes gave it away, for a blink at a time.`
  const r = record(found)
  document.querySelector('[data-score]').textContent = `In this browser: ${r.found} found in ${r.played} ${r.played === 1 ? 'night' : 'nights'}${r.best > 1 ? `, best streak ${r.best}` : ''}.`
  document.querySelector('[data-again]').hidden = false
}

function replay() {
  const section = document.querySelector('.guests')
  section.classList.remove('is-done')
  pickIt()
  render(document.querySelector('[data-guests]'))
  document.querySelector('[data-verdict]').textContent = 'A new night. Look closely before you choose.'
  document.querySelector('[data-again]').hidden = true
  startTell(section)
}

async function share() {
  const url = `${location.origin}${location.pathname}#guests`
  const text = 'One of these eight guests isn\'t human. Can you spot it before it spots you?'
  try {
    if (navigator.share) await navigator.share({ title: 'Watchnight', text, url })
    else {
      await navigator.clipboard.writeText(`${text} ${url}`)
      toast('Dare copied: send it to a friend')
    }
  } catch {
    /* closed the share sheet */
  }
}

export function initGuests() {
  const list = document.querySelector('[data-guests]')
  if (!list) return
  pickIt()
  render(list)
  startTell(document.querySelector('.guests'))
  document.querySelector('[data-replay]').addEventListener('click', replay)
  document.querySelector('[data-share]').addEventListener('click', share)
}
