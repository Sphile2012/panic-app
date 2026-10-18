// Service worker — cache-first for app shell, network-first for API calls.
// Bump CACHE_VERSION on every deploy to force clients to pick up new assets.
const CACHE_VERSION = 'v2';
const CACHE_NAME    = `panic-ring-${CACHE_VERSION}`;

// Files to precache on install (app shell only — no API or external URLs)
const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — delete stale caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('panic-ring-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Supabase / external API calls
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/rest/') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/storage/') ||
      url.pathname.startsWith('/realtime/')) return;

  // Hashed assets (/assets/…) — cache-first, they are immutable
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetchAndCache(request))
    );
    return;
  }

  // Everything else — network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

function fetchAndCache(request) {
  return fetch(request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  });
}
