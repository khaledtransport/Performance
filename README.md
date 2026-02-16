# نظام إدارة النقل الجامعي 🚌

نظام ويب متكامل لإدارة وتشغيل ومتابعة باصات النقل الجامعي بشكل لحظي واحترافي.

## 🎯 المميزات الرئيسية

- ✅ **إدارة شاملة**: إدارة الجامعات، السائقين، الباصات، والمناديب
- 📅 **تقويم تفاعلي**: متابعة الرحلات اليومية والأسبوعية والشهرية
- 📊 **إحصائيات متقدمة**: تقارير شاملة عن الأداء والالتزام
- ⚡ **تحديث لحظي**: متابعة حالة الرحلات بشكل فوري
- 📱 **واجهة مندوب سهلة**: إدخال بيانات الرحلات بسرعة وبساطة
- 📥 **استيراد Excel**: تحويل ملفات Excel مباشرة إلى رحلات
- 🎨 **تصميم احترافي**: واجهة عربية جميلة ومتجاوبة

## 🛠️ التقنيات المستخدمة

- **Next.js 14** - إطار عمل React مع App Router
- **TypeScript** - للكتابة الآمنة
- **Prisma** - ORM لقاعدة البيانات
- **PostgreSQL** - قاعدة بيانات قوية
- **TailwindCSS** - للتصميم
- **shadcn/ui** - مكونات UI جاهزة
- **Lucide React** - أيقونات
- **XLSX** - قراءة ملفات Excel

## 📦 التثبيت والإعداد

### 1. متطلبات النظام

- Node.js 18+ 
- PostgreSQL 14+
- npm أو yarn

### 2. تثبيت المشروع

```bash
# نسخ المشروع
git clone <repository-url>
cd "University travel schedule for delegates"

# تثبيت الحزم
npm install
```

### 3. إعداد قاعدة البيانات

```bash
# نسخ ملف البيئة
cp .env.example .env

# تعديل ملف .env وإضافة رابط قاعدة البيانات
# DATABASE_URL="postgresql://user:password@localhost:5432/university_transport?schema=public"

# مفاتيح Push للجوال (PWA)
# أنشئها عبر: npx web-push generate-vapid-keys
# NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
# VAPID_PRIVATE_KEY="..."
# VAPID_SUBJECT="mailto:admin@example.com"
```

```bash
# إنشاء قاعدة البيانات
npm run db:push

# إنشاء Prisma Client
npm run db:generate

# إضافة بيانات تجريبية (اختياري)
npm run db:seed
```

### 4. تشغيل المشروع

```bash
# وضع التطوير
npm run dev

# المشروع سيعمل على http://localhost:3000
```

### 5. بناء المشروع للإنتاج

```bash
npm run build
npm start
```

## 📁 هيكل المشروع

```
.
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── universities/    # إدارة الجامعات
│   │   ├── drivers/         # إدارة السائقين
│   │   ├── buses/           # إدارة الباصات
│   │   ├── representatives/ # إدارة المناديب
│   │   ├── routes/          # الرحلات الأساسية
│   │   ├── trips/           # الرحلات اليومية
│   │   ├── statistics/      # الإحصائيات
│   │   └── import/          # استيراد Excel
│   ├── dashboard/           # لوحة التحكم
│   ├── delegate/            # واجهة المندوب
│   ├── admin/               # لوحة الإدارة
│   ├── layout.tsx           # التخطيط الرئيسي
│   ├── page.tsx             # الصفحة الرئيسية
│   └── globals.css          # الأنماط العامة
├── components/
│   └── ui/                  # مكونات shadcn/ui
├── lib/
│   ├── prisma.ts           # Prisma Client
│   └── utils.ts            # دوال مساعدة
├── prisma/
│   ├── schema.prisma       # مخطط قاعدة البيانات
│   └── seed.js             # بيانات تجريبية
└── package.json
```

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

#### `universities` - الجامعات
- `id`: معرف فريد
- `name`: اسم الجامعة
- `createdAt`, `updatedAt`: تواريخ

#### `drivers` - السائقين
- `id`: معرف فريد
- `name`: اسم السائق
- `phone`: رقم الهاتف
- `createdAt`, `updatedAt`: تواريخ

#### `buses` - الباصات
- `id`: معرف فريد
- `busNumber`: رقم الباص (فريد)
- `capacity`: السعة
- `plateNumber`: رقم اللوحة
- `createdAt`, `updatedAt`: تواريخ

#### `representatives` - المناديب
- `id`: معرف فريد
- `name`: اسم المندوب
- `phone`: رقم الهاتف
- `email`: البريد الإلكتروني
- `createdAt`, `updatedAt`: تواريخ

#### `routes` - الرحلات الأساسية
- `id`: معرف فريد
- `universityId`: معرف الجامعة
- `driverId`: معرف السائق
- `busId`: معرف الباص
- `representativeId`: معرف المندوب
- `totalGoTrips`: عدد رحلات الذهاب
- `totalReturnTrips`: عدد رحلات العودة
- `isActive`: حالة التفعيل
- `createdAt`, `updatedAt`: تواريخ

#### `route_trips` - الرحلات اليومية
- `id`: معرف فريد
- `routeId`: معرف الرحلة الأساسية
- `tripDate`: تاريخ الرحلة
- `direction`: الاتجاه (GO/RETURN)
- `tripTime`: الوقت
- `studentsCount`: عدد الطلاب
- `status`: الحالة (PENDING/DEPARTED/ARRIVED/DELAYED/CANCELLED)
- `departureTime`: وقت المغادرة الفعلي
- `arrivalTime`: وقت الوصول الفعلي
- `notes`: ملاحظات
- `createdAt`, `updatedAt`: تواريخ

## 🔌 API Endpoints

### الجامعات
```
GET    /api/universities      - جلب جميع الجامعات
POST   /api/universities      - إضافة جامعة
GET    /api/universities/:id  - جلب جامعة محددة
PUT    /api/universities/:id  - تحديث جامعة
DELETE /api/universities/:id  - حذف جامعة
```

### السائقين
```
GET    /api/drivers      - جلب جميع السائقين
POST   /api/drivers      - إضافة سائق
GET    /api/drivers/:id  - جلب سائق محدد
PUT    /api/drivers/:id  - تحديث سائق
DELETE /api/drivers/:id  - حذف سائق
```

### الباصات
```
GET    /api/buses      - جلب جميع الباصات
POST   /api/buses      - إضافة باص
GET    /api/buses/:id  - جلب باص محدد
PUT    /api/buses/:id  - تحديث باص
DELETE /api/buses/:id  - حذف باص
```

### المناديب
```
GET    /api/representatives      - جلب جميع المناديب
POST   /api/representatives      - إضافة مندوب
GET    /api/representatives/:id  - جلب مندوب محدد
PUT    /api/representatives/:id  - تحديث مندوب
DELETE /api/representatives/:id  - حذف مندوب
```

### الرحلات الأساسية
```
GET    /api/routes      - جلب جميع الرحلات
POST   /api/routes      - إضافة رحلة
GET    /api/routes/:id  - جلب رحلة محددة
PUT    /api/routes/:id  - تحديث رحلة
DELETE /api/routes/:id  - حذف رحلة
```

### الرحلات اليومية
```
GET    /api/trips?date=YYYY-MM-DD&status=PENDING  - جلب رحلات مع فلترة
POST   /api/trips                                  - إضافة رحلة يومية
GET    /api/trips/:id                              - جلب رحلة محددة
PUT    /api/trips/:id                              - تحديث رحلة
DELETE /api/trips/:id                              - حذف رحلة
```

### الإحصائيات
```
GET    /api/statistics?date=YYYY-MM-DD  - جلب إحصائيات النظام
```

### استيراد Excel
```
POST   /api/import/excel  - استيراد ملف Excel (multipart/form-data)
```

## 📱 الواجهات

### 1. الصفحة الرئيسية (`/`)
- نظرة عامة على النظام
- روابط سريعة للوحة التحكم والمندوب

### 2. لوحة التحكم (`/dashboard`)
- إحصائيات شاملة
- قائمة الرحلات اليومية
- فلترة حسب التاريخ والحالة
- أفضل السائقين أداءً
- الجامعات الأكثر نشاطاً

### 3. واجهة المندوب (`/delegate`)
- نموذج سهل لتسجيل الرحلات
- اختيار الرحلة الأساسية
- تحديد التاريخ والوقت
- إدخال عدد الطلاب
- تحديث الحالة

### 4. لوحة الإدارة (`/admin`)
- إدارة جميع عناصر النظام
- روابط لصفحات الإدارة المختلفة

## 🎨 التصميم

- تصميم عربي كامل مع دعم RTL
- ألوان احترافية ومتناسقة
- واجهة متجاوبة (Desktop, Tablet, Mobile)
- أيقونات واضحة ومعبرة
- رسائل واضحة للمستخدم

## 🔧 التخصيص

### إضافة أوقات جديدة
عدّل المصفوفات في:
- `app/delegate/page.tsx`
- `app/api/import/excel/route.ts`

### تغيير الألوان
عدّل ملف `app/globals.css` في قسم `:root`

### إضافة حقول جديدة
1. عدّل `prisma/schema.prisma`
2. نفّذ `npm run db:push`
3. عدّل API endpoints المناسبة
4. عدّل الواجهات

## 🐛 استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
تأكد من:
- PostgreSQL يعمل
- `DATABASE_URL` صحيح في `.env`
- الصلاحيات صحيحة

### الأيقونات لا تظهر
```bash
npm install lucide-react
```

### أخطاء Prisma
```bash
npm run db:generate
npm run db:push
```

## 📝 ملاحظات مهمة

- احرص على عمل نسخة احتياطية من قاعدة البيانات بشكل دوري
- استخدم HTTPS في الإنتاج
- راجع الصلاحيات قبل النشر
- اختبر استيراد Excel بملفات تجريبية أولاً

## 🚀 التطوير المستقبلي

- [ ] نظام مصادقة وصلاحيات
- [ ] إشعارات فورية (Push Notifications)
- [ ] تقارير PDF
- [ ] تصدير البيانات
- [ ] نسخة تطبيق موبايل
- [ ] دعم عدة لغات
- [ ] نظام رسائل داخلي

## 📄 الترخيص

هذا المشروع للاستخدام الشخصي والتعليمي.

## 👨‍💻 الدعم

للمساعدة أو الاستفسارات، يمكنك:
- فتح Issue في GitHub
- التواصل عبر البريد الإلكتروني

---

**تم التطوير بـ ❤️ باستخدام Next.js و Prisma**
