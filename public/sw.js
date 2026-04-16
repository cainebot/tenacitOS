const CACHE = "mc-v4";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Skip cross-origin requests (Supabase API, CDNs, etc.) — let browser handle them
  if (url.origin !== self.location.origin) return;
  // Network-first for: API, office pages, and all navigation requests (HTML)
  const isNavigation = e.request.mode === "navigate";
  if (isNavigation || url.pathname.startsWith("/api/") || url.pathname.startsWith("/office")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    // Cache-first for same-origin static assets only (images, fonts, CSS, JS chunks)
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })));
  }
});
