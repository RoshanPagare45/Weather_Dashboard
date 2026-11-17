/*
 * Minimal service worker: caches the app shell so the page opens
 * offline. API calls are NEVER cached here (the app has its own
 * short-lived cache and must always show fresh weather online).
 */
const CACHE = "weather-shell-v2";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(["/", "/favicon.svg", "/icons/icon-192.png"]))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k !== CACHE)
                        .map((k) => caches.delete(k))
                )
            )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Only same-origin GETs; everything else goes straight to network.
    if (event.request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    // Network first, fall back to cache when offline.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE).then((c) => c.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
