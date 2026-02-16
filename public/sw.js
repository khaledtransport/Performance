const CACHE_NAME = "university-transport-v1";
const OFFLINE_URL = "/Performance/offline";

// الملفات المطلوب تخزينها
const STATIC_ASSETS = [
  "/Performance",
  "/Performance/offline",
  "/Performance/manifest.json",
];

// التثبيت
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// التفعيل
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// معالجة الطلبات
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // تخطي طلبات غير GET
  if (request.method !== "GET") return;

  // تخطي طلبات API
  if (request.url.includes("/api/")) return;

  // تخطي WebSocket و chrome-extension
  if (
    request.url.startsWith("chrome-extension") ||
    request.url.includes("_next/webpack")
  )
    return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // تخزين الصفحات في الكاش
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // عدم اتصال - جرب الكاش
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // إذا لم يوجد في الكاش، اعرض صفحة عدم الاتصال
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("غير متاح حالياً", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
      })
  );
});
