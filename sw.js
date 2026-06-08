/* =====================================================
   AlatiphA GES Pasco — Service Worker
   ─────────────────────────────────────────────────
   HOW TO UPDATE:
   Bump APP_VERSION on every release (e.g. "1.0.1").
   The cache name updates automatically. Users will
   get a "New version available" prompt on next visit.
===================================================== */

const APP_VERSION  = "1.0.1";
const CACHE_NAME   = `alatipha-ges-pasco-${APP_VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sw-beta.js",
  "./manifest-beta.json",
  "./library/sample.epub",
  "./icon-beta-192.png",
  "./icon-beta-512.png",
];

/* =========================
   INSTALL — cache app shell
========================= */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting()) // activate immediately after caching succeeds
  );

});

/* =========================
   ACTIVATE — clean old caches
========================= */

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );

});

/* =========================
   FETCH — network-first for
   HTML/JS/CSS, cache-first
   for EPUB and icons
========================= */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppShell =
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css")  ||
    url.pathname.endsWith(".js")   ||
    url.pathname.endsWith(".json") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");

  if (isAppShell) {

    /* Network-first: always try to get the freshest
       app shell, fall back to cache if offline */
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );

  } else {

    /* Cache-first: EPUB, icons, fonts — stable assets */
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(networkResponse => {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
              return networkResponse;
            });
        })
        .catch(() => caches.match("./index.html"))
    );

  }

});

/* =========================
   MESSAGE — version check
========================= */

self.addEventListener("message", event => {

  if (event.data === "GET_VERSION") {
    event.ports[0].postMessage(APP_VERSION);
  }

});
