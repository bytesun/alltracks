const CACHE_NAME = 'suntrack-v3';
const urlsToCache = [
  '/manifest.json',
  '/static/css/main.css'
];

// On install, cache a minimal set of assets. Failures for individual
// assets are tolerated so the SW still installs.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(urlsToCache.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (!resp.ok) throw new Error(`Fetch failed ${resp.status} for ${url}`);
          await cache.put(url, resp.clone());
          return { url, ok: true };
        } catch (e) {
          console.warn('service-worker: failed to cache', url, e);
          return { url, ok: false, err: String(e) };
        }
      }));
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value.ok).map(r => r.value.url);
      if (failed.length) console.warn('service-worker: some assets failed to cache', failed);
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch handler:
// - For navigation requests (HTML) use network-first so the client
//   gets the latest `index.html` after deploys. Cache a copy of the
//   fetched index.html so we can fall back when offline.
// - For other requests (static assets) use cache-first to improve
//   performance.
self.addEventListener('fetch', event => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';

  const isNavigation = req.mode === 'navigate' || (req.method === 'GET' && accept.includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(req).then(networkResponse => {
        // Save a copy of the freshest index.html for offline fallback
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy)).catch(() => {});
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For other requests, prefer cache and fall back to network
  event.respondWith(
    caches.match(req).then(response => response || fetch(req))
  );
});
