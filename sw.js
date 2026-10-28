/**
 * FinStack Pro v2.0 - Service Worker (PWA Offline Engine)
 * Caches core application shell & UI assets for instant load and 100% offline capability,
 * while bypassing live cloud API endpoints (Supabase & Gemini) so data is never stale.
 */

const CACHE_NAME = 'finstack-pro-shell-v2.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/store.js',
  './js/charts.js',
  './js/calendar.js',
  './js/ai-assistant.js',
  './js/wealth.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache live Supabase REST/Realtime or Gemini AI requests
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') && url.pathname.includes('/v1beta/')
  ) {
    return;
  }

  // Stale-while-revalidate for same-origin app files & CDN static libraries
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      const fetchPromise = fetch(req)
        .then(networkResponse => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (cachedResponse) return cachedResponse;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
