// ======================================================
// QEVIRA SERVICE WORKER
// PWA OFFLINE CACHE + APP SHELL
// ======================================================

const CACHE_NAME = "qevira-v2";

// Absolute repository routing fixes file resolution on GitHub Pages
const APP_SHELL = [
  "/QEVIRA/",
  "/QEVIRA/index.html",
  "/QEVIRA/style.css",
  "/QEVIRA/app.js",
  "/QEVIRA/manifest.json",
  "/QEVIRA/icons/icon-192.png",
  "/QEVIRA/icons/icon-512.png"
];

// ======================================================
// INSTALL
// ======================================================

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ======================================================
// FETCH
// ======================================================

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Don't interfere with external services
  // such as Supabase, CDN, news APIs, etc.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(networkResponse => {

            // Don't cache invalid responses
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {

            // If a page request fails offline,
            // return the cached app shell.
            if (request.mode === "navigate") {
              return caches.match("/QEVIRA/index.html");
            }

            return new Response(
              "QEVIRA is currently offline.",
              {
                status: 503,
                headers: {
                  "Content-Type": "text/plain"
                }
              }
            );
          });
      })
  );
});

// ======================================================
// SKIP WAITING MESSAGE
// ======================================================

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
