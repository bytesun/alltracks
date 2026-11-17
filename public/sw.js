/* AllTracks offline app shell.
 * Offline QR landings work only after this browser has visited AllTracks
 * while online and installed this service worker. This is not a substitute
 * for a real, signed, location-proof protocol.
 */
const CACHE_NAME = 'alltracks-offline-shell-v1';
const SHELL_PATH = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const html = await fetch(SHELL_PATH, { cache: 'reload' });
      if (!html.ok) throw new Error('App shell was not available');
      const text = await html.clone().text();
      await cache.put(SHELL_PATH, html.clone());
      await cache.put('/', html.clone());
      // Vite injects hashed script, stylesheet and modulepreload assets into
      // index.html. Save them for later QR navigation without signal.
      const assets = [...text.matchAll(/(?:src|href)=["'](\/assets\/[^"'?]+)["']/g)]
        .map(match => match[1]);
      await Promise.allSettled([...new Set(assets)].map(async path => {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response);
      }));
    } catch {
      // Do not block installation when connectivity drops mid-install.
      // The next online visit can populate the cache through fetch handlers.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('alltracks-offline-shell-') &&
      key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && (response.headers.get('Content-Type') || '').includes('text/html')) {
          await cache.put(SHELL_PATH, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(SHELL_PATH)) ||
          new Response('AllTracks is not cached on this device. Reconnect to load the app.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
