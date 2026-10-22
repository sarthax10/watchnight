// Builds public/data/*.json for the site:
//   progress.json  - the house log (data/progress.json, plus the commit count from git)
//   stats.json     - the numbers: YouTube's public view counts (read from the channel's own pages),
//                    the hand-kept ones (data/stats.manual.json), and a dated history so the site can
//                    draw growth. Discord's member count is read live by the browser instead.
// Run: node scripts/build-data.mjs   (npm run build runs it first)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const CHANNEL = 'https://www.youtube.com/@WatchnightGame'
mkdirSync('public/data', { recursive: true })

// --- progress ----------------------------------------------------------------------------------------
const progress = JSON.parse(readFileSync('data/progress.json', 'utf8'))
try {
  progress.commits = Number(execSync('git rev-list --count HEAD -- ../games/watchnight', { encoding: 'utf8' }).trim())
} catch {
  // (no game history here — GitHub's build of the site repo): keep the last count
  const last = existsSync('public/data/progress.json') ? JSON.parse(readFileSync('public/data/progress.json', 'utf8')) : {}
  progress.commits = last.commits ?? null
}
writeFileSync('public/data/progress.json', JSON.stringify(progress))

// --- stats -------------------------------------------------------------------------------------------
/** "1,234 views" / "1.2K views" -> 1234 / 1200 */
function parseViews(text) {
  const m = String(text).replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i)
  if (!m) return 0
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1
  return Math.round(parseFloat(m[1]) * mult)
}

async function youtubeViews() {
  // the channel's own pages: each video's count appears as text ("933 views"); the Shorts tab prints
  // each one twice (title card and overlay), so consecutive repeats are one video
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
  let total = 0
  let videos = 0
  for (const tab of ['videos', 'shorts']) {
    const res = await fetch(`${CHANNEL}/${tab}`, { headers: { 'accept-language': 'en-US,en;q=0.9', 'user-agent': UA } })
    const counts = (await res.text()).match(/[\d.,]+[KMB]? views/g) || []
    const items = tab === 'shorts' ? counts.filter((c, i) => i % 2 === 0) : counts
    for (const c of items) {
      total += parseViews(c)
      videos += 1
    }
  }
  return { total, videos }
}

const manual = JSON.parse(readFileSync('data/stats.manual.json', 'utf8'))
const prev = existsSync('public/data/stats.json') ? JSON.parse(readFileSync('public/data/stats.json', 'utf8')) : { history: [] }
let yt = null
try {
  yt = await youtubeViews()
  // (a consent page or a changed layout reads as no videos: keep the last numbers, never a 0)
  if (!yt.videos) yt = null
} catch (e) {
  console.warn('youtube: could not read the channel', e.message)
}
const today = new Date().toISOString().slice(0, 10)
const numbers = {
  youtube_views: yt ? { value: yt.total, asOf: today } : prev.numbers?.youtube_views ?? { value: null },
  instagram_plays: manual.instagram_plays,
  itch_views: manual.itch_views,
  itch_downloads: manual.itch_downloads,
}
const history = (prev.history || []).filter((h) => h.date !== today)
history.push({ date: today, ...Object.fromEntries(Object.entries(numbers).map(([k, v]) => [k, v?.value ?? null])) })
writeFileSync('public/data/stats.json', JSON.stringify({ updated: new Date().toISOString(), numbers, history: history.slice(-120) }))
console.log('data: progress', progress.milestones.length, 'milestones,', progress.commits, 'commits; youtube', yt)
