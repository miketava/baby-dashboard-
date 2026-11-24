// Baby Routine Dashboard — service worker: makes the page installable and lets it open offline.
// The page itself is always fetched fresh when online (network first), so new versions show up
// on the next reload. Requests to Google (your Sheet) are never cached.
const CACHE = 'baby-log-v3';
const LIBS = ['cdn.jsdelivr.net'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const same = url.origin === location.origin, lib = LIBS.includes(url.hostname);
  if (!same && !lib) return;                       // Sheet / Apps Script / anything else: straight to network
  if (lib) {                                       // versioned CDN libraries: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => {           // the dashboard: network first, cached copy when offline
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('./'))));
});
