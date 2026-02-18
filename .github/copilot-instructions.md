# تعليمات GitHub Copilot — مشروع النقل الجامعي

## معلومات المشروع الأساسية

- **الإطار:** Next.js 15.5.12 (App Router) مع TypeScript
- **basePath:** `/Performance` — جميع API calls من Client تبدأ بـ `/Performance/api/...`
- **قاعدة البيانات:** PostgreSQL عبر Supabase + Prisma ORM
- **المصادقة:** JWT في cookies — `lib/auth.ts` — (`getCurrentUser`, `hashPassword`, `verifyPassword`)
- **التشغيل المحلي:** `localhost:3001`
- **النشر:** Vercel — فرع `main` — مستودع `khaledtransport/Performance`
- **آخر commit:** `76bb3c2`

---

## Tailwind CSS v4 — قواعد صارمة

| ❌ قديم | ✅ صحيح |
|---------|---------|
| `bg-gradient-to-*` | `bg-linear-to-*` |
| `flex-shrink-0` | `shrink-0` |
| `break-words` | `wrap-break-word` |
| `w-[Npx]` | `w-{N/4}` (كل 4px = وحدة واحدة) |
| `h-[500px]` | `h-125` |
| `w-[200px]` | `w-50` |
| `w-[140px]` | `w-35` |
| `w-[120px]` | `w-30` |
| `z-[100]` | `z-100` |
| `min-h-[120px]` | `min-h-30` |
| `md:w-[400px]` | `md:w-100` |

---

## بنية المجلدات

```
Performance/
├── app/
│   ├── admin/
│   │   ├── buses/
│   │   ├── districts/
│   │   ├── driver-assignments/   ← ربط السائقين + إنشاء حسابات
│   │   ├── drivers/
│   │   ├── import/
│   │   ├── notifications/
│   │   ├── representatives/
│   │   ├── routes/
│   │   └── universities/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── driver-assignments/
│   │   │   └── drivers-users/
│   │   ├── auth/  buses/  districts/  driver/  drivers/
│   │   ├── health/  import/  notifications/  push/
│   │   ├── representatives/  routes/  statistics/
│   │   ├── tracking/  trips/  universities/
│   ├── dashboard/  (page.tsx, calendar/)
│   ├── delegate/   (page.tsx, delegate-client.tsx)
│   ├── driver/     (page.tsx, tracking/)
│   ├── login/  offline/  reports/  test-toast/  tracking/
├── components/
│   ├── map-tracker-v2.tsx   ← الوحيدة (map-tracker.tsx محذوف)
│   ├── navigation-bar.tsx
│   ├── notification-center.tsx
│   ├── breadcrumb.tsx  loading-skeleton.tsx  mobile-trip-card.tsx
│   ├── pwa-install.tsx  quick-navigation.tsx  theme-toggle.tsx
│   ├── dashboard/  delegate/
│   └── ui/ (badge, button, card, input, label, select, toast, toaster, use-toast)
├── lib/
│   ├── auth.ts       ← getCurrentUser, hashPassword, verifyPassword
│   ├── prisma.ts     ← Prisma client singleton
│   ├── cache.ts  utils.ts  supabase-server.ts  query-cache.ts
│   ├── hooks/ (useStatistics, useTrips, useTripsRange)
│   ├── utils/ (time-slots)
│   └── validations/ (route)
├── hooks/ (use-auth.tsx, use-notifications.ts)
├── prisma/schema.prisma
├── public/ (manifest.json, sw.js, icons/)
├── supabase/config.toml
├── .github/copilot-instructions.md
├── next.config.js  middleware.ts  vercel.json  netlify.toml
```

---

## نماذج قاعدة البيانات

```prisma
University  { id(cuid), name(unique) }
District    { id(uuid), name(unique) }
Representative { id, name, phone?, email? }

Bus { id(uuid), busNumber(unique), capacity=50, isActive=true }
Driver { id(uuid), name, phone?, licenseNumber?
         → user User? @relation("DriverUser") }
BusDriverAssignment { id, busId, driverId, assignedAt, unassignedAt?, isActive=true }

Route {
  id, universityId, driverId, busId, districtId?, representativeId?
  totalGoTrips=0, totalReturnTrips=0, isActive=true
}
RouteTrip { id, routeId, tripDate(Date), direction, tripTime(String), studentsCount=0, status=PENDING }
Trip {
  id, busId, tripDate(Date), direction, scheduledTime(Time)
  actualDepartureTime?, actualArrivalTime?, status=PENDING
  passengersCount=0, notes?, routeId?
}
enum TripStatus   { PENDING DEPARTED ARRIVED DELAYED CANCELLED }
enum TripDirection { GO RETURN }

User {
  id(uuid), username(unique), email?(unique), passwordHash, fullName
  role=VIEWER, isActive=true
  driverId?(unique) → Driver @relation("DriverUser")
  lastLoginAt?
}
enum UserRole { ADMIN MANAGER DELEGATE DRIVER VIEWER }

Notification { id, userId?, title, message, type, priority, soundType?, isRead=false, link?, senderId? }
enum NotificationType  { INFO SUCCESS WARNING ERROR TRIP_UPDATE SYSTEM URGENT SCHEDULE }
enum NotificationPriority { LOW NORMAL HIGH CRITICAL }

PushSubscription { id, userId, endpoint(unique), p256dh, auth, userAgent? }

BusLocation     { id, busId, latitude, longitude, speed?, heading?, accuracy?, timestamp }
TrackingSession { id, busId, routeId?, startedAt, lastPointAt, endedAt?, status=ACTIVE, source=DRIVER_APP }
TrackingPoint   { id, sessionId, busId, latitude, longitude, speed?, heading?, accuracy?, isRoadSnapped=false, timestamp, source }
enum TrackingSessionStatus { ACTIVE PAUSED ENDED }
enum TrackingSource        { DRIVER_APP GPS_FALLBACK IMPORTED }
```

---

## المصادقة

```ts
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
const user = await getCurrentUser();   // يقرأ JWT من cookies — null إذا غير مسجل
const hash = await hashPassword(pw);   // bcrypt 12 rounds
const ok   = await verifyPassword(pw, hash);
```

| الدور | الصلاحيات |
|-------|-----------|
| ADMIN | كامل الصلاحيات |
| MANAGER | إدارة + تقارير |
| DELEGATE | تسجيل الرحلات |
| DRIVER | واجهة السائق + GPS |
| VIEWER | قراءة فقط |

---

## قواعد إلزامية لتجنب الأخطاء

### 1. JSX Structure
- اقرأ الملف كاملاً قبل التعديل
- عند تحويل `return (<div>)` إلى Fragment `(<>)`:
  أبقِ `<div>` الداخلي وأغلقه `</div>` **قبل** أي Modal JSX

### 2. SSR / Hydration
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
const isDriver = mounted && user?.role === "DRIVER";  // false على SSR
// <nav suppressHydrationWarning>
```
لا `toLocaleString()` في SSR.

### 3. useCallback + useEffect
```tsx
const fetchData = useCallback(async () => { /* ... */ }, [deps]);
useEffect(() => { fetchData(); }, [fetchData]);  // بعد التعريف دائماً
```

### 4. API Calls
- Client Components: `/Performance/api/...`
- كل API handler يبدأ بـ `getCurrentUser()` + فحص الدور

---

## شريط التنقل (navigation-bar.tsx)

- ارتفاع: `h-14`
- `isDriver = mounted && user?.role === "DRIVER"` — لا تقرأ الدور قبل mount
- Admin dropdown: click فقط (بدون hover)
- Mobile: backdrop overlay + scroll lock على body
- `suppressHydrationWarning` على `<nav>`

---

## الخريطة (map-tracker-v2.tsx)

- **الوحيدة المستخدمة** — `map-tracker.tsx` محذوف نهائياً
- Leaflet مباشر — بدون `react-leaflet`
- موضع `.bm-glow` يُحسب في JS (لا `translateX`)
- `createIcon()` تُعيد HTML string مع `bm-wrap` + `bm-glow`

---

## صفحة ربط السائقين (admin/driver-assignments/page.tsx)

الميزات الحالية:
1. عرض قائمة السائقين مع حالة الربط
2. ربط بحساب DRIVER موجود غير مربوط (dropdown)
3. **إنشاء حساب جديد** — زر أخضر لكل سائق بدون حساب
4. فك الربط — زر أحمر
5. تخصيص باص / فك تخصيصه

State الخاص بالمودال:
```tsx
const [createModal, setCreateModal] = useState<{ open: boolean; driver: DriverData|null }>
const [createForm, setCreateForm]   = useState({ username, fullName, password, confirmPassword })
const [createLoading, setCreateLoading] = useState(false)
const [showPass, setShowPass]           = useState(false)

openCreate(driver)   // pre-fill الاسم + فتح المودال
submitCreate()       // تحقق password≥6 + match → POST
```

API action:
```ts
// POST: { action: "create_driver_user", driverId, username, password, fullName }
// يتحقق: username فريد، driver موجود، driver غير مربوط بعد
// ينشئ: User { role: "DRIVER", driverId } + hashPassword()
```

---

## نمط API Routes

```ts
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN","MANAGER"].includes(user.role))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  // ...
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
```

---

## سجل الإصلاحات

| المشكلة | الإصلاح | commit |
|---------|---------|--------|
| bg-gradient-to-* (23 ملف) | bg-linear-to-* | d9933e1 |
| dashboard useCallback corruption | استعادة fetchData | edcb9a0 |
| NavBar hydration mismatch | mounted guard | 54f6e68 |
| إنشاء حساب سائق | API + modal | 66425d3 |
| parse error missing div | إضافة </div> | 9df1040 |
| تحديث الذاكرة | copilot-instructions | 76bb3c2 |

---

## قواعد لا تنساها

1. ❌ `map-tracker.tsx` — فقط `map-tracker-v2.tsx`
2. ❌ `react-leaflet` — Leaflet مباشر فقط
3. ❌ `bg-gradient-to-*` — فقط `bg-linear-to-*`
4. ❌ `user.role` بدون `mounted` guard في Client Components
5. ✅ Client fetches: `/Performance/api/...` دائماً
6. ✅ PWA: `sw.js` + `manifest.json` + `app/offline/`
7. ✅ Push notifications: model `PushSubscription` + `/api/push/`
8. ✅ نظام تتبع GPS كامل: `BusLocation` + `TrackingSession` + `TrackingPoint`
