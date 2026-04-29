const CACHE_NAME = "neyra-v11";

// Не кэшируем index.html — он должен всегда быть свежим
const urlsToCache = [
  "/css/style.css",
  "/css/avatar.css",
  "/styles/design-system.css"
];

self.addEventListener("install", event => {
  self.skipWaiting(); // активируем новый SW немедленно
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key)) // удаляем старые кэши
      )
    ).then(() => self.clients.claim()) // берём контроль немедленно
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // index.html — всегда с сервера, никогда не из кэша
  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // JS/CSS с хэшем — кэшируем агрессивно (имя меняется при изменении)
  if (url.pathname.match(/\.(js|css)$/) && url.pathname.includes('-')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Остальное — сеть с fallback на кэш
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});