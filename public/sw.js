// Watchnight's service worker. Strategies by kind:
//   pages (navigations)         network first, the cached copy offline
//   /assets/* (hashed by Vite), fonts, images, audio
//                               cache first: they never change under the same name; image and audio
//                               caches are capped so a visit can't fill the visitor's disk
//   /data/*.json                stale-while-revalidate: instant, then refreshed for next time
// Bump VERSION to drop every old cache.
const VERSION = 'wn-3'
const SHELL = `${VERSION}-shell`
const STATIC = `${VERSION}-static`
const MEDIA = `${VERSION}-media`
const DATA = `${VERSION}-data`
const MEDIA_MAX = 60

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './fonts/CormorantGaramond.woff2', './fonts/Alegreya.woff2'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

async function trim(name, max) {
  const c = await caches.open(name)
  const keys = await c.keys()
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i])
}

async function cacheFirst(req, name, max) {
  const hit = await caches.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok && res.type === 'basic') {
    const c = await caches.open(name)
    c.put(req, res.clone())
    if (max) trim(name, max)
  }
  return res
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) (await caches.open(SHELL)).put(req, res.clone())
    return res
  } catch {
    return (await caches.match(req)) || (await caches.match('./'))
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(DATA)
  const hit = await c.match(req)
  const fresh = fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone())
    return res
  }).catch(() => hit)
  return hit || fresh
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return // third parties (YouTube, Discord) go straight to the network
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req))
  // (paths below the worker's own scope: / locally, /watchnight/ on GitHub Pages)
  const path = '/' + url.pathname.slice(new URL(self.registration.scope).pathname.length)
  if (path.startsWith('/data/')) return e.respondWith(staleWhileRevalidate(req))
  if (path.startsWith('/assets/') || path.startsWith('/fonts/')) return e.respondWith(cacheFirst(req, STATIC))
  if (path.startsWith('/img/') || path.startsWith('/audio/')) return e.respondWith(cacheFirst(req, MEDIA, MEDIA_MAX))
})
