// sw.js — Yojana Saarthi service worker
// Strategy:
//  - Fingerprinted build assets (/assets/*): cache-first, they never change.
//  - Scheme list: stale-while-revalidate (fast offline + fresh online).
//  - App shell (/, /index.html): network-first. A cached shell would keep
//    pointing at asset filenames that the next deploy deletes, so freshness
//    wins here and the cache is only a fallback for offline use.
//  - Everything else: network first, cache fallback, then offline page.
const CACHE = "yojana-saarthi-v1";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest"];
const SCHEME_URL = "/api/schemes";
const ASSET_PREFIX = "/assets/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache, refresh in the background.
function staleWhileRevalidate(event) {
  return caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request)
      .then((res) => {
        if (res && res.ok) cache.put(event.request, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || network;
  });
}

// Serve from cache immediately, only hitting the network on a miss.
function cacheFirst(event) {
  return caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const res = await fetch(event.request);
    if (res && res.ok) cache.put(event.request, res.clone());
    return res;
  });
}

// Prefer the network, fall back to whatever we cached last time.
function networkFirst(event) {
  return caches.open(CACHE).then(async (cache) => {
    try {
      const res = await fetch(event.request);
      if (res && res.ok) cache.put(event.request, res.clone());
      return res;
    } catch (err) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw err;
    }
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(cacheFirst(event));
    return;
  }

  if (url.pathname === SCHEME_URL) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  if (SHELL.includes(url.pathname)) {
    event.respondWith(networkFirst(event));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
