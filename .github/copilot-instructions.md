# تعليمات GitHub Copilot — مشروع النقل الجامعي

## معلومات المشروع الأساسية

- **الإطار:** Next.js 15.5.12 (App Router) مع TypeScript
- **basePath:** `/Performance` — جميع الـ API calls تبدأ بـ `/Performance/api/...`
- **قاعدة البيانات:** PostgreSQL عبر Supabase + Prisma ORM
- **المصادقة:** JWT في cookies — `lib/auth.ts` — (`getCurrentUser`, `hashPassword`, `verifyPassword`)
- **التشغيل المحلي:** `localhost:3001`
- **النشر:** Vercel — فرع `main` من مستودع `khaledtransport/Performance`

---

## Tailwind CSS v4 — قواعد صارمة

**لا تستخدم أبداً الكلاسات القديمة:**

| ❌ قديم | ✅ صحيح |
|---------|---------|
| `bg-gradient-to-br/b/r/l/tr/tl/bl` | `bg-linear-to-br/b/r/l/tr/tl/bl` |
| `flex-shrink-0` | `shrink-0` |
| `break-words` | `wrap-break-word` |
| `h-[500px]` | `h-125` |
| `md:h-[600px]` | `md:h-150` |
| `max-h-[500px]` | `max-h-125` |
| `w-[200px]` | `w-50` |
| `w-[140px]` | `w-35` |
| `w-[120px]` | `w-30` |
| `min-h-[120px]` | `min-h-30` |
| `z-[100]` | `z-100` |
| `min-w-[20px]` | `min-w-5` |
| `md:w-[400px]` | `md:w-100` |
| `md:max-h-[520px]` | `md:max-h-130` |
| `md:w-[430px]` | `md:w-107.5` |

---

## بنية المجلدات

```
Performance/
├── app/
│   ├── admin/
│   │   ├── buses/
│   │   ├── districts/
│   │   ├── driver-assignments/   # ربط + إنشاء حسابات السائقين
│   │   ├── drivers/
│   │   ├── notifications/
│   │   ├── representatives/
│   │   ├── routes/
│   │   └── universities/
│   ├── api/
│   ├── dashboard/
│   ├── delegate/
│   ├── driver/
│   │   └── tracking/
│   ├── login/
│   ├── reports/
│   └── tracking/                 # خريطة تتبع الباصات
├── components/
│   ├── map-tracker-v2.tsx        # الخريطة (النسخة الوحيدة المستخدمة)
│   ├── navigation-bar.tsx
│   ├── notification-center.tsx
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── utils.ts
└── prisma/
    └── schema.prisma
```

---

## قواعد لتجنب الأخطاء

### 1. JSX Structure
- **دائماً اقرأ الملف كاملاً قبل التعديل** لتجنب إغلاق tags خاطئ
- كل `<>` يُغلق بـ `</>`
- كل `<div>` مفتوح يُغلق بـ `</div>`
- عند تحويل return من `<div>` إلى `<>` fragment: تأكد من إغلاق الـ div الداخلي أيضاً

### 2. SSR / Hydration
- أي مكون يستخدم `useAuth()` أو `window` أو `Date.now()` يحتاج mounted guard:
  ```tsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // استخدم: mounted && user?.role === "DRIVER"
  ```
- `suppressHydrationWarning` على العناصر التي تختلف بين SSR والعميل
- لا تستخدم `toLocaleString()` في SSR — استخدم `date-fns/format`

### 3. const / function declarations
- `const fetchData = useCallback(...)` يجب أن يُعرَّف **قبل** `useEffect(() => { fetchData(); }, [fetchData])`
- لا تخلط بين صيغة function declaration وconst assignment

### 4. API Calls
- جميع fetches في Client Components تبدأ بـ `/Performance/api/...`
- الـ Server-side (API routes) لا تحتاج basePath

---

## نماذج قاعدة البيانات

```prisma
User       { id, username, passwordHash, fullName, role, driverId?, isActive }
Driver     { id, name, phone?, licenseNumber? }
Bus        { id, busNumber, capacity, isActive }
BusDriverAssignment { driverId, busId, isActive, assignedAt, unassignedAt? }
Trip       { id, busId, routeId, date, status }
BusLocation { busId, latitude, longitude, speed, heading }
```

**أدوار المستخدمين:**
- `ADMIN` → كامل الصلاحيات
- `MANAGER` → إدارة + تقارير
- `DELEGATE` → تسجيل الرحلات
- `DRIVER` → واجهة السائق + GPS
- `VIEWER` → قراءة فقط

---

## المصادقة

```ts
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
const user = await getCurrentUser(); // يقرأ JWT من cookies
const hash = await hashPassword(password); // bcrypt 12 rounds
const ok   = await verifyPassword(password, hash);
```

---

## شريط التنقل (`navigation-bar.tsx`)

- ارتفاع ثابت `h-14`
- `isDriver = mounted && user?.role === "DRIVER"` — لا تحقق من الدور قبل mount
- Admin dropdown: click-only (بدون hover)
- Mobile menu: backdrop overlay + scroll lock على body

---

## الخريطة (`map-tracker-v2.tsx`)

- **النسخة الوحيدة** — `map-tracker.tsx` محذوف
- Leaflet مباشر (بدون react-leaflet)
- `.bm-glow` CSS: لا `translateX(-50%)` — موضعها يُحسب في JS
- الأيقونة: `createIcon()` تُعيد HTML string مع `bm-wrap` و `bm-glow`

---

## آخر الميزات المضافة

- **إنشاء حساب سائق:** modal في `admin/driver-assignments` → action `create_driver_user`
- **Mounted guard في NavBar:** يمنع hydration mismatch
- **Tailwind v4 migration:** `bg-gradient-to-*` → `bg-linear-to-*` في جميع الملفات

