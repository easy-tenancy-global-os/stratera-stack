// ════════════════════════════════════════════════════════════════════════
//  sw.js — STRATERA Estate v4.4 service worker (UX directive #5)
//  ─────────────────────────────────────────────────────────────────────
//  Minimal offline-cache stub. Caches the shell + last intel response.
//  Push notifications NOT wired (needs VAPID — Tier 1 work).
// ════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'et-v4.4'
const SHELL_CACHE   = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const SHELL_URLS = [
  '/',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ── Stale-while-revalidate for /api/intel/proptech (last good snapshot) ──
  if (url.pathname === '/api/intel/proptech') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const networkPromise = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached || new Response(
            JSON.stringify({ ok: false, source: 'stub', items: [] }),
            { headers: { 'Content-Type': 'application/json' } }
          ))
        return cached || networkPromise
      })
    )
    return
  }

  // ── Network-first for HTML navigation; fallback to cached shell ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // ── Cache-first for static assets (/static/*, /assets/*) ──
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
      })
    )
  }
})
