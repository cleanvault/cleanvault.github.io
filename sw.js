/*
 * CleanVault Service Worker
 * ========================
 * Enables CleanVault to launch and operate with NO internet connection,
 * after the customer has completed at least one successful visit.
 *
 * PRIVACY / SECURITY POSTURE (deliberately conservative):
 *   - This worker NEVER uploads, transmits, or stores user PDF contents.
 *   - Customer PDFs never become HTTP requests. They are read from a local
 *     File via File.arrayBuffer() and written back out through a Blob/object
 *     URL download, so they never reach a fetch handler and cannot be cached.
 *   - No analytics, telemetry, cookies, or third-party contact of any kind.
 *   - Only the explicitly enumerated same-origin URLs in PRECACHE_URLS are
 *     ever stored. There is NO general-purpose runtime cache, so unknown or
 *     third-party URLs can never be written to the cache.
 *   - Non-GET and cross-origin requests are passed through untouched.
 *
 * WHY pdf-lib IS NOT LOADED HERE:
 *   pdf-lib is intentionally NOT loaded via importScripts(). The pdf-lib UMD
 *   bundle publishes itself to the *page* global (`window.PDFLib`); loading it
 *   inside a worker would pollute the worker scope and would not satisfy the
 *   application. It therefore remains a normal local page resource at
 *   /vendor/pdf-lib.min.js and is precached like any other asset.
 *
 * ---------------------------------------------------------------------------
 * !! CACHE VERSIONING - READ BEFORE DEPLOYING !!
 * ---------------------------------------------------------------------------
 * CACHE_VERSION MUST be manually incremented EVERY time any file listed in
 * PRECACHE_URLS is added, removed, or modified. This is the mechanism that
 * lets returning customers pick up a new release.
 *
 *   Example: 'cleanvault-v1'  ->  'cleanvault-v2'
 *
 * Without this bump, browsers keep serving the cached copy forever. With it:
 *   - the new worker precaches into a brand-new cache name,
 *   - the old cache is kept fully intact and still usable,
 *   - the new worker activates ONLY after its precache fully succeeds,
 *   - the previous cache is deleted during activation.
 * A failed precache therefore aborts the install and leaves the last known
 * good version fully working offline. There is no path where a partial or
 * broken cache replaces a working one.
 * ---------------------------------------------------------------------------
 */

'use strict';

const CACHE_VERSION = 'cleanvault-v6';
const CACHE_NAME = CACHE_VERSION;
/*
 * Complete application shell required to launch and operate CleanVault.
 * Derived from the actual <script>/<link> references in index.html.
 * Keep in sync with index.html; bump CACHE_VERSION whenever this changes.
 */
const PRECACHE_URLS = [
  // Document + entry points
  '/',
  '/index.html',
  '/offline.html',

  // Stylesheet (self-contained; contains no url() or @import references)
  '/style.css',

  // Vendored PDF library (local, SRI-pinned - no CDN dependency)
  '/vendor/pdf-lib.min.js',

  // Application scripts, in index.html load order
  '/js/pdf-tools.js',
  '/js/license.js',
  '/js/limits.js',
  '/js/ui.js',
  '/js/merge.js',
  '/js/split.js',
  '/js/extract.js',
  '/js/rotate.js',
  '/js/remove-metadata.js',
  '/js/reorder.js',
  '/js/watermark.js',
  '/js/page-numbers.js',
  '/js/remove.js',
  '/js/batch.js',
  '/js/sw-register.js',

  // Icons / assets
  '/assets/favicon.ico',
  '/assets/favicon-16x16.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon-48x48.png',
  '/assets/apple-touch-icon.png',
  '/assets/logo.svg',
];

/*
 * Paths treated as "the CleanVault application document" when handling a
 * navigation request offline.
 */
const APP_SHELL_URLS = ['/', '/index.html'];

/*
 * Fast membership check for the precache list, so the fetch handler can
 * decide cheaply whether a request is one of our known app resources.
 */
const PRECACHE_SET = new Set(PRECACHE_URLS);

/*
 * Only caches owned by this worker are ever considered for deletion.
 * The prefix guarantees we cannot touch another app's storage.
 */
const CACHE_PREFIX = 'cleanvault-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // cache.addAll() is atomic: if ANY entry fails, the returned promise
      // rejects and nothing is treated as a successful install. We open a
      // cache with a NEW name (CACHE_NAME includes CACHE_VERSION), so a
      // failure here can never damage the previous, working cache.
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (error) {
        // The failed install leaves an empty/partial cache behind. Remove only
        // THIS worker's newly-named cache so it cannot linger as orphaned
        // storage. CACHE_NAME is the new version, so the previously active
        // version's cache is never touched and the customer keeps a fully
        // working, complete offline copy.
        await caches.delete(CACHE_NAME);
        throw error;
      }

      // Reached only when the entire shell precached successfully.
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          // Only ever delete caches this worker owns.
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Take control of open clients without requiring an extra navigation.
      await self.clients.claim();
    })()
  );
});
/**
 * Handle a top-level navigation request.
 *
 * Strategy: cached application shell first (this is what makes a returning
 * customer able to open CleanVault while GitHub Pages is unreachable),
 * falling back to the network, then to the offline notice page.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);

  const isAppShell = APP_SHELL_URLS.includes(url.pathname);

  if (isAppShell) {
    // Prefer the precached application shell.
    const cachedShell = await cache.match('/index.html');
    if (cachedShell) return cachedShell;

    try {
      return await fetch(request);
    } catch (error) {
      const cachedIndex = await cache.match('/');
      if (cachedIndex) return cachedIndex;
      return offlineResponse();
    }
  }

  // Any other page (e.g. /privacy.html, /terms.html, /success.html).
  // These are not part of the offline tool, so prefer fresh network content
  // and only fall back to an honest offline notice.
  try {
    return await fetch(request);
  } catch (error) {
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) return offlinePage;
    return offlineResponse();
  }
}

/**
 * Cache-first handler for known, precached same-origin static resources.
 * Never falls back to anything other than the network, so an unexpected
 * response can never be silently stored.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handlePrecachedResource(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  // Not in the cache: go to the network, but do NOT store the result.
  return fetch(request);
}

/**
 * Minimal, dependency-free offline notice used only when offline.html is
 * somehow unavailable as well.
 *
 * @returns {Response}
 */
function offlineResponse() {
  return new Response(
    'CleanVault is unavailable offline. Please reconnect to the internet and try again.',
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1) Non-GET requests are passed through untouched and never cached.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  // 2) Cross-origin requests are passed through untouched.
  //    This guarantees we never intercept, proxy, or cache third-party
  //    traffic (Stripe links, the feedback form, any future external asset).
  if (url.origin !== self.location.origin) return;

  // 3) Navigation requests (opening/reloading CleanVault).
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // 4) Same-origin GETs that are part of the precached application shell.
  //    Note: blob: and data: URLs never reach a service worker's fetch
  //    handler as same-origin http requests, so object URLs used for PDF
  //    downloads are inherently unaffected.
  if (PRECACHE_SET.has(url.pathname)) {
    event.respondWith(handlePrecachedResource(request));
    return;
  }

  // 5) Anything else (including unknown paths) is left entirely alone.
  //    No runtime caching, no interception, no storage.
});