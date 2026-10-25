
const CACHE_NAME = "amar-krishi-offline-v2";
const APP_BASE = "/amar-krishi-roadmap/";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    const files = [
      APP_BASE,
      APP_BASE + "index.html",
      APP_BASE + "manifest.webmanifest"
    ];

    for (const file of files) {
      try {
        const response = await fetch(file, {
          cache: "reload"
        });

        if (response.ok) {
          await cache.put(file, response);
        }
      } catch (error) {
        // একটি ফাইল ব্যর্থ হলেও বাকি ফাইল ক্যাশ হবে
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("amar-krishi-offline-") &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_BASE)
  ) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(
            APP_BASE + "index.html",
            response.clone()
          );
        }

        return response;
      } catch (error) {
        const cached =
          await cache.match(request) ||
          await cache.match(APP_BASE + "index.html") ||
          await cache.match(APP_BASE);

        if (cached) return cached;

        return new Response(
          "অফলাইন। অ্যাপটি একবার ইন্টারনেট চালু রেখে খুলুন।",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      return new Response("", { status: 503 });
    }
  })());
});
