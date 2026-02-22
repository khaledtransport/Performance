import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // نسبة تتبع الأداء — 20% من الطلبات (خفيف على الإنتاج)
  tracesSampleRate: 0.2,

  // تسجيل إعادات الجلسات عند حدوث أخطاء فقط
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // تفعيل فقط في الإنتاج
  enabled: process.env.NODE_ENV === "production",

  // تصفية الأخطاء غير المهمة
  beforeSend(event) {
    // تجاهل أخطاء الشبكة العادية (المستخدم offline)
    if (event.exception?.values?.[0]?.type === "TypeError") {
      const msg = event.exception.values[0].value || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
        return null;
      }
    }
    return event;
  },

  // تجاهل أخطاء المتصفح الشائعة
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "AbortError",
    "ChunkLoadError",
  ],
});

// تتبع تنقلات الصفحات في App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
