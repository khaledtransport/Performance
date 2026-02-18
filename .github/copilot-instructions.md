# تعليمات GitHub Copilot — مشروع النقل الجامعي

> **آخر تحديث:** 18 فبراير 2026 | آخر commit: `100f415` (PWA SSR fix + Uber-style bus icon)

## معلومات المشروع الأساسية

- **الإطار:** Next.js 15.5.12 (App Router) مع TypeScript
- **basePath:** `/Performance` — جميع API calls من Client تبدأ بـ `/Performance/api/...`
- **قاعدة البيانات:** PostgreSQL عبر Supabase + Prisma ORM (`prisma/schema.prisma`)
- **المصادقة:** JWT في cookies — `lib/auth.ts` — (`getCurrentUser`, `hashPassword`, `verifyPassword`)
- **JWT library:** `jose` (ليس `jsonwebtoken`) | **bcrypt:** `bcryptjs` (ليس `bcrypt`)
- **التشغيل المحلي:** `localhost:3000` (افتراضي — قابل للتغيير بـ `.env`)
- **النشر:** Vercel — فرع `main` — مستودع `khaledtransport/alkhaledlog-platform`
- **TypeScript:** أخطاؤه تُوقف البناء | **ESLint:** مُتجاهَل أثناء البناء
- **Tailwind:** v4 — انتبه لتغيرات class names (راجع جدول الأسفل)

---

## أوامر المطور

\`\`\`bash
npm run dev          # تشغيل محلي
npm run build        # prisma generate && next build
npm run db:push      # تطبيق schema بدون migration
npm run db:studio    # Prisma Studio
npm run db:seed      # بيانات تجريبية (npx tsx prisma/seed.ts)
npm run db:generate  # توليد Prisma Client
\`\`\`

> **ملاحظة Supabase:** `DATABASE_URL` = pooler (pgBouncer) | `DIRECT_URL` = direct connection — كلاهما مطلوب في `.env`.

---

## Tailwind CSS v4 — قواعد صارمة

| ❌ قديم (v3) | ✅ صحيح (v4) |
|---|---|
| `bg-gradient-to-*` | `bg-linear-to-*` |
| `flex-shrink-0` | `shrink-0` |
| `break-words` | `wrap-break-word` |
| `w-[200px]` | `w-50` (كل 4px = وحدة واحدة) |
| `h-[500px]` | `h-125` |
| `z-[100]` | `z-100` |
| `min-h-[120px]` | `min-h-30` |
| `md:w-[400px]` | `md:w-100` |

---

## بنية المجلدات

\`\`\`
Performance/
├── app/
│   ├── admin/           ← ADMIN/MANAGER فقط
│   │   ├── driver-assignments/  ← ربط السائقين + إنشاء حسابات
│   │   └── (buses/districts/drivers/notifications/routes/universities/...)
│   ├── api/             ← API Routes (Next.js Route Handlers)
│   ├── dashboard/       ← تقويم + إحصائيات
│   ├── delegate/        ← تسجيل الرحلات (DELEGATE)
│   ├── driver/          ← واجهة السائق + GPS (DRIVER)
│   └── (login/offline/reports/tracking/)
├── components/
│   ├── map-tracker-v2.tsx   ← الوحيدة المستخدمة (map-tracker.tsx محذوف)
│   ├── navigation-bar.tsx   ← h-14، mounted guard، mobile overlay
│   ├── notification-center.tsx
│   └── ui/ (badge/button/card/input/label/select/toast/toaster)
├── lib/
│   ├── auth.ts          ← getCurrentUser, hashPassword, verifyPassword, createToken
│   ├── prisma.ts        ← Prisma client singleton
│   ├── cache.ts         ← SimpleCache in-memory (TTL افتراضي 30 ثانية)
│   ├── query-cache.ts   ← query-level caching
│   ├── jwt-config.ts    ← JWT_SECRET_BYTES, TOKEN_EXPIRY
│   ├── supabase-server.ts
│   ├── hooks/           (useStatistics, useTrips, useTripsRange)
│   ├── utils/           (time-slots)
│   └── validations/     (route)
├── hooks/               (use-auth.tsx, use-notifications.ts)
├── prisma/schema.prisma
└── public/ (manifest.json, sw.js, icons/)
\`\`\`

---

## نماذج قاعدة البيانات

\`\`\`prisma
University  { id(cuid), name(unique) }
District    { id(uuid), name(unique) }
Representative { id, name, phone?, email? }
Bus { id(uuid), busNumber(unique), capacity=50, isActive=true }
Driver { id(uuid), name, phone?, licenseNumber? → user User? @relation("DriverUser") }
BusDriverAssignment { id, busId, driverId, assignedAt, unassignedAt?, isActive=true }
Route { id, universityId, driverId, busId, districtId?, representativeId?, totalGoTrips=0, totalReturnTrips=0, isActive=true }
RouteTrip { id, routeId, tripDate(Date), direction, tripTime(String), studentsCount=0, status=PENDING }
Trip { id, busId, tripDate, direction, scheduledTime, actualDepartureTime?, actualArrivalTime?, status=PENDING, passengersCount=0, routeId? }
User { id(uuid), username(unique), passwordHash, fullName, role=VIEWER, isActive=true, driverId?(unique) }
Notification { id, userId?, title, message, type, priority, soundType?, isRead=false }
PushSubscription { id, userId, endpoint(unique), p256dh, auth }
BusLocation     { id, busId, latitude, longitude, speed?, heading?, timestamp }
TrackingSession { id, busId, routeId?, startedAt, lastPointAt, endedAt?, status=ACTIVE }
TrackingPoint   { id, sessionId, busId, latitude, longitude, speed?, heading?, timestamp, source }

enum TripStatus:            PENDING | DEPARTED | ARRIVED | DELAYED | CANCELLED
enum TripDirection:         GO | RETURN
enum UserRole:              ADMIN | MANAGER | DELEGATE | DRIVER | VIEWER
enum NotificationType:      INFO | SUCCESS | WARNING | ERROR | TRIP_UPDATE | SYSTEM | URGENT | SCHEDULE
enum NotificationPriority:  LOW | NORMAL | HIGH | CRITICAL
enum TrackingSessionStatus: ACTIVE | PAUSED | ENDED
enum TrackingSource:        DRIVER_APP | GPS_FALLBACK | IMPORTED
\`\`\`

---

## المصادقة والأدوار

\`\`\`ts
import { getCurrentUser } from "@/lib/auth";
const user = await getCurrentUser(); // يقرأ JWT من cookies — null إذا غير مسجل
\`\`\`

| الدور | الصلاحيات |
|---|---|
| ADMIN | كامل الصلاحيات |
| MANAGER | إدارة + تقارير |
| DELEGATE | تسجيل الرحلات |
| DRIVER | واجهة السائق + GPS |
| VIEWER | قراءة فقط |

`middleware.ts` يحمي المسارات تلقائياً. Route guard في الكود:
\`\`\`ts
if (!user || !["ADMIN","MANAGER"].includes(user.role))
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
\`\`\`

---

## نمط API Routes

\`\`\`ts
// app/api/[resource]/route.ts
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN","MANAGER"].includes(user.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { action, ...body } = await request.json();
  switch (action) {
    case "create": { /* prisma.create() */ break; }
    case "update": { /* prisma.update() */ break; }
    case "delete": { /* prisma.delete() */ break; }
    default:
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
}
\`\`\`

**Caching في API Routes** (`lib/cache.ts` — SimpleCache، TTL 30s افتراضي):
\`\`\`ts
import { cache } from "@/lib/cache";
const cached = cache.get<DataType>("key");
if (cached) return NextResponse.json(cached);
const data = await prisma.model.findMany();
cache.set("key", data, 60_000); // 60 ثانية
// تحذير: الكاش في الذاكرة لا يُشارَك بين serverless instances
\`\`\`

---

## قواعد إلزامية لتجنب الأخطاء

### 1. SSR / Hydration
\`\`\`tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
const isDriver = mounted && user?.role === "DRIVER";  // false على SSR
// <nav suppressHydrationWarning>
\`\`\`
- لا `toLocaleString()` في SSR
- لا `user.role` بدون `mounted` guard في Client Components

### 2. useCallback + useEffect
\`\`\`tsx
const fetchData = useCallback(async () => { /* ... */ }, [deps]);
useEffect(() => { fetchData(); }, [fetchData]); // useEffect دائماً بعد التعريف
\`\`\`

### 3. JSX Structure
- اقرأ الملف كاملاً قبل التعديل
- عند تحويل `return (<div>)` إلى Fragment `(<>)`: أبقِ الـ `<div>` الداخلي وأغلقه **قبل** أي Modal JSX

---

## الخريطة والتتبع

- `map-tracker-v2.tsx` = **الوحيدة المستخدمة** — `map-tracker.tsx` محذوف نهائياً
- **Leaflet مباشر** — بدون `react-leaflet`
- `createIcon()` تُعيد HTML string مع `bm-wrap` + `bm-glow`
- موضع `.bm-glow` يُحسب في JS (لا `translateX`)

---

## صفحة ربط السائقين (admin/driver-assignments)

الإجراءات عبر POST `action`:
- `"create_driver_user"` — ينشئ `User { role: "DRIVER", driverId }` + `hashPassword()`; يتحقق: username فريد، driver موجود وغير مربوط
- `"link"` — يربط سائق بحساب DRIVER موجود غير مربوط
- `"unlink"` — فك الربط
- `"assign_bus"` / `"unassign_bus"` — تخصيص/فك تخصيص الباص

---

## شريط التنقل (navigation-bar.tsx)

- ارتفاع: `h-14`
- `isDriver = mounted && user?.role === "DRIVER"` — لا تقرأ الدور قبل mount
- Admin dropdown: click فقط (بدون hover)
- Mobile: backdrop overlay + scroll lock على body
- `suppressHydrationWarning` على `<nav>`

---

## PWA والإشعارات

- `public/sw.js` — Service Worker
- `public/manifest.json` — PWA manifest
- `app/offline/` — صفحة offline
- Push Notifications: model `PushSubscription` + `/api/push/`
- VAPID keys: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT`

---

## قواعد لا تنساها (ملخص)

1. ❌ `map-tracker.tsx` — فقط `map-tracker-v2.tsx`
2. ❌ `react-leaflet` — Leaflet مباشر فقط
3. ❌ `bg-gradient-to-*` — فقط `bg-linear-to-*`
4. ❌ `user.role` بدون `mounted` guard في Client Components
5. ❌ `jsonwebtoken` / `bcrypt` — استخدم `jose` / `bcryptjs`
6. ✅ Client fetches: `/Performance/api/...` دائماً (بسبب basePath)
7. ✅ Supabase: `DATABASE_URL` (pooler) + `DIRECT_URL` (direct) — كلاهما في `.env`
8. ✅ أخطاء TypeScript تُوقف البناء — ESLint لا يوقفه
