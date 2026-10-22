// IndexedDB: this browser's own record of the numbers it has seen (one snapshot a day), so the tallies
// can draw how the house has grown between visits even for the live Discord count, which has no
// public history. Small, local, and optional: any failure just means no sparkline.
const DB = 'watchnight'
const STORE = 'snapshots'

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'date' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSnapshot(values) {
  try {
    const db = await open()
    const date = new Date().toISOString().slice(0, 10)
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ date, ...values })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* private window or blocked: skip */
  }
}

export async function snapshots() {
  try {
    const db = await open()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}
