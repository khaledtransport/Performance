const CACHE_NAME = "university-transport-v6";
const OFFLINE_URL = "/Performance/offline";

// الملفات الثابتة للتخزين المسبق
const STATIC_ASSETS = [
  "/Performance",
  "/Performance/offline",
  "/Performance/manifest.json",
];

// التثبيت
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// التفعيل — حذف جميع الكاشات القديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// معالجة الطلبات — Network-First مع Fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // تخطي: API، WebSocket، webpack HMR، chrome-extension
  const url = request.url;
  if (url.includes("/api/") || url.startsWith("chrome-extension") || url.includes("_next/webpack")) return;

  // ملفات Next.js الثابتة (hashed) — Cache-First (لا تتغير أبداً)
  if (url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // باقي الطلبات — Network-First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match(OFFLINE_URL);
          return new Response("غير متاح", { status: 503 });
        })
      )
  );
});
