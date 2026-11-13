/* GES Pasco: reader and cache share the release in version.js. */
importScripts("./version.js");
const CACHE_VERSION = "v" + globalThis.GES_PASCO_VERSION;
const CACHE_NAME = `alatipha-ges-pasco-${CACHE_VERSION}`;
// Only the redacted sample EPUB is ever stored here; never migrate legacy full books.
const SAMPLE_BOOK_CACHE = "ges-pasco-sample-library-v1";

/* ====================
   APP SHELL
==================== */

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./admin.html",
  "./admin.css",
  "./admin-page.js",
  "./admin-users-core.js",
  "./admin-reports-core.js",
  "./admin-reports.js",
  "./faq.html",
  "./privacy.html",
  "./terms.html",
  "./policy.css",
  "./style.css",
  "./app.js",
  "./version.js",
  "./updates.js",
  "./ui-theme.js",
  "./offline-reader.js",
  "./reader-recovery.js",
  "./user-guide.js",
  "./firebase-config.js",
  "./firestore-data.js",
  "./practice-sync-core.js",
  "./auth.js",
  "./access-core.js",
  "./reader-devices-core.js",
  "./reader-devices.js",
  "./access.js",
  "./premium-content.js",
  "./account-settings.js",
  "./account-menu.js",
  "./momo-core.js",
  "./momo.js",
  "./data-accounts-core.js",
  "./data-accounts.js",
  "./study-backup-core.js",
  "./study-backup.js",
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

// Bound every network miss so a slow connection cannot hold app startup or installation open.
const NETWORK_TIMEOUT_MS = 12000;
async function fetchWithTimeout(request, init = {}, completeBody = false, milliseconds = NETWORK_TIMEOUT_MS) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const options = {...init};
  if (controller) options.signal = controller.signal;
  let timer;
  try {
    const timedRequest = controller || Object.keys(options).length ? new Request(request, options) : request;
    const attempts = [(async()=>{const response=await fetch(timedRequest);if(completeBody)await response.clone().arrayBuffer();return response;})()];
    if (typeof setTimeout === 'function') attempts.push(new Promise((_, reject) => { timer = setTimeout(() => { controller?.abort(); reject(new Error('Network request timed out')); }, milliseconds); }));
    return await Promise.race(attempts);
  } finally { if (timer !== undefined && typeof clearTimeout === 'function') clearTimeout(timer); }
}

// Keep working copies until every required replacement has downloaded successfully.
let offlineJob = null;
async function validBook(response) {
  if (!response || !response.ok) return false;
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  return bytes.length > 100 && bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
}
async function matchCached(request, options) {
  if (typeof caches.match === 'function') return caches.match(request, options);
  const cache = await caches.open(CACHE_NAME);
  return typeof cache.match === 'function' ? cache.match(request, options) : undefined;
}
async function offlineStatus() {
  const cache = await caches.open(CACHE_NAME);
  const missing = [];
  for (const url of FILES_TO_CACHE) {
    const response = await (url.endsWith('.epub') ? await caches.open(SAMPLE_BOOK_CACHE) : cache).match(url);
    if (!response || !response.ok || (url.endsWith('.epub') && !await validBook(response))) missing.push(url);
  }
  return {version:CACHE_VERSION, ready:missing.length === 0, missing:missing.length, total:FILES_TO_CACHE.length};
}
function prepareOffline(includeBook = true) {
  if (offlineJob) return offlineJob;
  offlineJob = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const optional = url => /^https:\/\//.test(url) || url.startsWith('./fonts/');
    const isBook = url => url.endsWith('.epub');
    async function download(url,required){
      if(optional(url)&&!isBook(url)){const existing=await matchCached(url);if(existing?.ok)return {url,response:existing};}
      const response=await fetchWithTimeout(new Request(url,{cache:'reload'}),{},true,required?20000:8000);
      if(!response.ok||(url.endsWith('.epub')&&!await validBook(response)))throw Error('Incomplete download: '+url);
      if(url==='./version.js'&&!(await response.clone().text()).includes('"'+globalThis.GES_PASCO_VERSION+'"'))throw Error('Release files changed during download. Check for updates again.');
      return {url,response};
    }
    async function collect(urls,required){
      const results=new Array(urls.length);let cursor=0;
      await Promise.all(Array.from({length:Math.min(4,urls.length)},async()=>{while(cursor<urls.length){const i=cursor++;try{results[i]={status:'fulfilled',value:await download(urls[i],required)};}catch(error){results[i]={status:'rejected',reason:Error(urls[i]+': '+error.message)};}}}));
      return results;
    }
    const required=await collect(FILES_TO_CACHE.filter(url=>!optional(url)&&(includeBook||!isBook(url))),true);
    const failed=required.filter(r=>r.status==='rejected');
    if(failed.length){
      try{const diagnostics=await caches.open('ges-pasco-update-status');await diagnostics.put('./status.json',new Response(JSON.stringify({version:CACHE_VERSION,errors:failed.map(r=>r.reason.message)}),{headers:{'Content-Type':'application/json'}}));}catch{}
      throw Error('Required app files could not be cached: '+failed.map(r=>r.reason.message).join('; '));
    }
    // Only commit a complete new app shell. Optional dependencies cannot block it.
    for(const result of required){const target=result.value.url.endsWith('.epub')?await caches.open(SAMPLE_BOOK_CACHE):cache;await target.put(result.value.url,result.value.response);}
    const extras=await collect(FILES_TO_CACHE.filter(url=>optional(url)&&!isBook(url)),false);
    for(const result of extras)if(result.status==='fulfilled')await cache.put(result.value.url,result.value.response);
    return offlineStatus();
  })().finally(() => {offlineJob = null;});
  return offlineJob;
}

/* =========================
   INSTALL â€” cache app shell
========================= */

self.addEventListener("install", event => {

  event.waitUntil(prepareOffline(false));

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
    event.respondWith(fetchWithTimeout(event.request, {cache:'no-store'}));
    return;
  }
  const isAppShell =
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css")  ||
    url.pathname.endsWith(".js")   ||
    url.pathname.endsWith(".json") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");

  // Read cached app resources first. The new worker replaces the old shell
  // only after its install has fetched and validated every required file.
  event.respondWith((async () => {
    const isSampleBook=url.pathname.endsWith('/library/sample.epub');
    const sampleBooks=isSampleBook?await caches.open(SAMPLE_BOOK_CACHE):null;
    const cached = isSampleBook?await sampleBooks.match(event.request):await matchCached(event.request, {ignoreSearch:isAppShell});
    if (cached) return cached;
    try {
      const response = await fetchWithTimeout(event.request, {cache:'no-store'});
      if (!response.ok) throw new Error('Download unavailable');
      const clone = response.clone();
      caches.open(isSampleBook?SAMPLE_BOOK_CACHE:CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
      return response;
    } catch {
      if (event.request.mode === 'navigate') return (await matchCached('./index.html')) || Response.error();
      return Response.error();
    }
  })());

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
