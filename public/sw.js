const CACHE_NAME = "university-transport-v15";
const OFFLINE_URL = "/Performance/offline";

// الملفات الثابتة للتخزين المسبق
const STATIC_ASSETS = [
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

  // تخطي: API، ملفات Next الداخلية، WebSocket، webpack HMR، chrome-extension
  const url = request.url;
  if (
    url.includes("/api/") ||
    url.includes("/_next/") ||
    url.startsWith("chrome-extension") ||
    url.includes("_rsc=")
  ) {
    return;
  }

  // صفحات التنقل: Network-Only مع fallback أوفلاين (تجنب HTML قديم بعد النشر)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
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

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "إشعار جديد", body: "لديك تحديث جديد" };
  }

  const title = payload.title || "إشعار جديد";
  const options = {
    body: payload.body || "لديك إشعار جديد",
    icon: payload.icon || "/Performance/icons/icon-192x192.png",
    badge: payload.badge || "/Performance/icons/icon-192x192.png",
    tag: payload.tag || "transport-notification",
    dir: payload.dir || "rtl",
    data: {
      link: payload.link || "/Performance/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.link || "/Performance/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/Performance") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
