const CACHE_NAME = 'climanow-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network-first for API calls, cache-first for static assets.
  const isApi = request.url.includes('api.open-meteo.com') ||
    request.url.includes('apiprevmet3.inmet.gov.br') ||
    request.url.includes('cemaden-proxy.wasmer.app') ||
    request.url.includes('/api/cemaden');

  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});