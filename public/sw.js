// SMC Pro Enterprise Service Worker - Offline Cache & Site Reliability Engine
const CACHE_NAME = "smc-pro-offline-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install Event - Pre-cache critical application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching SMC Pro App Shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Failed to pre-cache some static assets:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[ServiceWorker] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with Cache Fallback for dynamic requests, Cache First for static
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Authenticated and API data must never be cached by the service worker.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Standard static assets & SPA navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh version in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore background fetch errors when offline */});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(async () => {
          // Fallback to index.html for SPA routes if navigation request
          if (event.request.mode === "navigate") {
            const indexCache = await caches.match("/index.html") || await caches.match("/");
            if (indexCache) return indexCache;
          }
          return new Response("Offline - SMC Pro cached page unavailable", {
            status: 503,
            statusText: "Service Unavailable (Offline)"
          });
        });
    })
  );
});
