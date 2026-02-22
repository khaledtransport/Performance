import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // نسبة تتبع الأداء — 10% على السيرفر (أقل من العميل)
  tracesSampleRate: 0.1,

  // تفعيل فقط في الإنتاج
  enabled: process.env.NODE_ENV === "production",

  // تصفية الأخطاء غير المهمة
  beforeSend(event) {
    // تجاهل 401/403 — ليست أخطاء حقيقية
    const statusCode = event.contexts?.response?.status_code;
    if (statusCode === 401 || statusCode === 403) {
      return null;
    }
    return event;
  },
});
