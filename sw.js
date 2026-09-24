// ======================================================
// QEVIRA SERVICE WORKER
// PWA OFFLINE CACHE + UPDATE SYSTEM
// ======================================================

const CACHE_NAME = "qevira-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// ======================================================
// INSTALL
// ======================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ======================================================
// FETCH
// ======================================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Do not cache external websites/APIs
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // Fallback to the main app page when offline
            return caches.match("./index.html");
          });
      })
  );
});

// ======================================================
// MESSAGE HANDLER
// ======================================================

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
