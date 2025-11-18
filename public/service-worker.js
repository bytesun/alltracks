const CACHE_NAME = 'suntrack-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', event => {
  // Attempt to cache listed URLs but tolerate individual failures so
  // a single missing asset doesn't break the entire install step.
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(urlsToCache.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (!resp.ok) throw new Error(`Fetch failed ${resp.status} for ${url}`);
          await cache.put(url, resp.clone());
          return { url, ok: true };
        } catch (e) {
          // swallow single-URL errors but log for debugging
          console.warn('service-worker: failed to cache', url, e);
          return { url, ok: false, err: String(e) };
        }
      }));
      // Optional: log summary
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value.ok).map(r => r.value.url);
      if (failed.length) console.warn('service-worker: some assets failed to cache', failed);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
