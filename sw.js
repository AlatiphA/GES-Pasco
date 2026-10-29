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
  "./ui-theme.js",
  "./offline-reader.js",
  "./reader-recovery.js",
  "./firebase-config.js",
  "./firestore-data.js",
  "./auth.js",
  "./account-settings.js",
  "./quiz-core.js",
  "./quiz-admin-core.js",
  "./question-banks.js",
  "./quiz-admin.js",
  "./practice-tests.js",
  "./question-reports-core.js",
  "./question-reports.js",
  "./notifications.js",
  "./reading-dashboard.js",
  "./revision-core.js",
  "./practice-bank.json",
  "./install.js",
  "./manifest.json",
  "./library/sample.epub",
  "./icon-192.png",
  "./icon-512.png",
  "./fonts/OpenSans-VariableFont_wdth_wght.ttf",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/webfonts/fa-regular-400.woff2",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-compat.js",
];

// Keep working copies until each replacement has downloaded successfully.
let offlineJob = null;
async function validBook(response) {
  if (!response || !response.ok) return false;
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  return bytes.length > 100 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
}
async function offlineStatus() {
  const cache = await caches.open(CACHE_NAME);
  const missing = [];
  for (const url of FILES_TO_CACHE) {
    const response = await cache.match(url);
    if (!response || !response.ok || (url.endsWith('.epub') && !await validBook(response))) missing.push(url);
  }
  return {version:CACHE_VERSION, ready:missing.length === 0, missing:missing.length, total:FILES_TO_CACHE.length};
}
function prepareOffline() {
  if (offlineJob) return offlineJob;
  offlineJob = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(FILES_TO_CACHE.map(async url => {
      const response = await fetch(new Request(url, {cache:'reload'}));
      if (!response.ok || (url.endsWith('.epub') && !await validBook(response))) throw new Error('Incomplete download: '+url);
      if (url === './version.js' && !(await response.clone().text()).includes('"'+globalThis.GES_PASCO_VERSION+'"')) throw new Error('A newer release is available. Install the app update before repairing downloads.');
      return {url,response};
    }));
    if (results.some(result => result.status === 'rejected')) throw new Error('Required app files could not be cached. Connect and retry; existing copies are retained.');
    for (const result of results) await cache.put(result.value.url, result.value.response);
    return offlineStatus();
  })().finally(() => {offlineJob = null;});
  return offlineJob;
}

/* =========================
   INSTALL â€” cache app shell
========================= */

self.addEventListener("install", event => {

  event.waitUntil(prepareOffline());

});

/* =========================
   ACTIVATE â€” clean old caches
========================= */

self.addEventListener("activate", event => {

  event.waitUntil((async () => {
    // Hand the new worker to open clients before optional old-cache cleanup.
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.allSettled(names.filter(name => name.startsWith("alatipha-ges-pasco-") && name !== CACHE_NAME).map(name => caches.delete(name)));
  })());

});

/* =========================
   FETCH â€” network-first for
   HTML/JS/CSS, cache-first
   for EPUB and icons
========================= */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  // Never proxy/cache Firebase's live channels or unrelated third-party requests.
  const origin = self.location?.origin || url.origin;
  if (url.origin !== origin && !FILES_TO_CACHE.includes(url.href)) return;
  const knownAsset = FILES_TO_CACHE.some(path => new URL(path, self.location?.href || url.origin + '/').href === url.href);
  if (url.origin === origin && !knownAsset && !/\.(?:html|css|js|json)$/.test(url.pathname) && !url.pathname.endsWith('/')) return;

  // A release check must never fall back to a cached version file.
  if (url.pathname.endsWith('/version.js') && url.searchParams.has('release-check')) {
    event.respondWith(fetch(new Request(event.request, {cache:'no-store'})));
    return;
  }
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
      fetch(new Request(event.request, {cache:'no-store'}))
        .then(networkResponse => {
          if (!networkResponse.ok) throw new Error('Download unavailable');
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );

  } else {

    /* Cache-first: EPUB, icons, fonts â€” stable assets */
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(networkResponse => {
              if (!networkResponse.ok) throw new Error('Download unavailable');
          const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
              return networkResponse;
            });
        })
        .catch(async () => event.request.mode === "navigate" ? (await caches.match("./index.html")) || Response.error() : Response.error())
    );

  }

});

/* =========================
   MESSAGE â€” version check
========================= */

self.addEventListener("message", event => {

  if (['OFFLINE_STATUS','PREPARE_OFFLINE'].includes(event.data) && event.ports[0]) {
    const port = event.ports[0];
    event.waitUntil((async () => {
      try { port.postMessage(await (event.data === 'PREPARE_OFFLINE' ? prepareOffline() : offlineStatus())); }
      catch (error) { port.postMessage({error:error.message}); }
    })());
  }
  if (event.data === "SKIP_WAITING") {
    const activation = self.skipWaiting();
    // Acknowledge the handover request before waiting for old pages/live requests.
    // The client can now navigate once, releasing those old connections.
    if (event.ports[0]) event.ports[0].postMessage({activationRequested:true,version:CACHE_VERSION});
    if (event.waitUntil) event.waitUntil(Promise.resolve(activation));
  }
  if (event.data === "GET_VERSION" && event.ports[0]) {
    event.ports[0].postMessage(CACHE_VERSION);
  }

});
