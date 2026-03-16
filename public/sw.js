const CACHE_NAME = 'support-portal-v1'
const OFFLINE_URL = '/offline'

// Static assets to pre-cache on install
const PRE_CACHE = [OFFLINE_URL]

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Skip Next.js internals and API routes (always network)
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/auth/')
  ) {
    event.respondWith(fetch(request))
    return
  }

  // Static assets (JS, CSS, fonts, images) — cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation and pages — network-first with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(request))
})

// ── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Network error', { status: 503 })
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // For navigation requests show the offline page
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL)
      if (offline) return offline
    }

    return new Response('Network error', { status: 503 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf)$/.test(pathname)
  )
}
