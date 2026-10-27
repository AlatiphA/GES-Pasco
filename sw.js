/* GES Pasco: reader and cache share the release in version.js. */
importScripts("./version.js");
const CACHE_VERSION = "v" + globalThis.GES_PASCO_VERSION;
const CACHE_NAME = `alatipha-ges-pasco-${CACHE_VERSION}`;

/* ====================
   APP SHELL
==================== */

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./faq.html",
  "./style.css",
  "./app.js",
  "./version.js",
  "./updates.js",
  "./firebase-config.js",
  "./firestore-data.js",
  "./auth.js",
  "./install.js",
  "./sw.js",
  "./manifest.json",
  "./library/sample.epub",
  "./icon-192.png",
  "./icon-512.png",
  "./fonts/OpenSans-VariableFont_wdth_wght.ttf",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css",
];

/* =========================
   INSTALL — cache app shell
========================= */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {

        // Local app files must finish caching before this release is ready.
        // A failure on the optional CDN stylesheet does not block installation.
        const results = await Promise.allSettled(
          FILES_TO_CACHE.map(url => cache.add(new Request(url, {cache: "reload"})))
        );

        if (results.some((result, i) => result.status === "rejected" && FILES_TO_CACHE[i].startsWith("./"))) {
          throw new Error("Required app files could not be cached; keeping the current release.");
        }
        results.forEach((result, i) => {
          if (result.status === "rejected") {
            console.warn(
              "Precache failed for:",
              FILES_TO_CACHE[i],
              result.reason
            );
          }
        });
      })
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
            .filter(name => name.startsWith("alatipha-ges-pasco-") && name !== CACHE_NAME)
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

  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "GET_VERSION" && event.ports[0]) {
    event.ports[0].postMessage(CACHE_VERSION);
  }

});
