const CACHE_NAME = "a-service-static-v7-brand-v2";
const OFFLINE_URLS = ["/ru/offline/", "/kk/offline/"];
const PRECACHE = [
  "/manifest.webmanifest",
  "/manifest-ru.webmanifest",
  "/manifest-kk.webmanifest",
  "/icons/favicon-32-v2.png",
  "/icons/apple-touch-icon-v2.png",
  "/icons/icon-192-v2.png",
  "/icons/icon-512-v2.png",
  "/images/a-service-logo-v2-transparent.png",
  "/images/a-service-mark-v2.png",
  "/images/a-service-og-v2.png",
  "/images/a-service-hero-mobile-poster-v2.webp",
  "/images/a-service-hero-desktop-poster-v2.webp",
  ...OFFLINE_URLS
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
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
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const locale = OFFLINE_URLS.find((path) =>
          url.pathname.startsWith(path.slice(0, 4))
        );
        const cached = await caches.match(locale || OFFLINE_URLS[0]);
        return (
          cached ||
          new Response("A-SERVICE is temporarily offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          })
        );
      })
    );
    return;
  }

  if (
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    (url.pathname.startsWith("/video/") &&
      !request.headers.has("range")) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
