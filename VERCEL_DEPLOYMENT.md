# 📋 توثيق نشر مشروع النقل الجامعي على Vercel

## 📅 تاريخ النشر: 3 ديسمبر 2025

---

## 🌐 روابط المشروع

| الوصف                 | الرابط                                                          |
| --------------------- | --------------------------------------------------------------- |
| **الموقع الرئيسي**    | https://performance-alpha-nine.vercel.app/Performance/          |
| **لوحة التحكم**       | https://performance-alpha-nine.vercel.app/Performance/dashboard |
| **صفحة المندوب**      | https://performance-alpha-nine.vercel.app/Performance/delegate  |
| **الإدارة**           | https://performance-alpha-nine.vercel.app/Performance/admin     |
| **GitHub Repository** | https://github.com/khaledtransport/Performance                  |
| **Vercel Dashboard**  | https://vercel.com/alkhaledlogs-projects/performance            |

---

## 🔌 APIs المتاحة

| Endpoint                                      | الوصف                           | مثال                              |
| --------------------------------------------- | ------------------------------- | --------------------------------- |
| `/Performance/api/health`                     | فحص صحة الاتصال بقاعدة البيانات | `{"status":"ok","db":[{"ok":1}]}` |
| `/Performance/api/universities`               | قائمة الجامعات                  | JSON array                        |
| `/Performance/api/drivers`                    | قائمة السائقين                  | JSON array                        |
| `/Performance/api/buses`                      | قائمة الحافلات                  | JSON array                        |
| `/Performance/api/districts`                  | قائمة المناطق                   | JSON array                        |
| `/Performance/api/routes`                     | قائمة المسارات                  | JSON array                        |
| `/Performance/api/trips`                      | قائمة الرحلات                   | JSON array                        |
| `/Performance/api/statistics?date=YYYY-MM-DD` | إحصائيات النظام                 | JSON object                       |
| `/Performance/api/representatives`            | قائمة المندوبين                 | JSON array                        |

---

## 🗄️ إعدادات قاعدة البيانات

### Supabase Project

- **Project ID:** `nysajqypudgkwxgxqvlk`
- **Region:** Northeast Asia (Seoul) - `ap-northeast-2`
- **Database Password:** `D@X055640050` (URL-encoded: `D%40X055640050`)

### Connection Strings

#### DATABASE_URL (للتطبيق - Pooler)

```
postgresql://postgres.nysajqypudgkwxgxqvlk:D%40X055640050@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**تفاصيل:**

- **Host:** `aws-1-ap-northeast-2.pooler.supabase.com`
- **Port:** `6543` (Connection Pooler)
- **Username:** `postgres.nysajqypudgkwxgxqvlk` (مع ref المشروع)
- **Database:** `postgres`
- **Parameters:** `pgbouncer=true`

#### DIRECT_URL (للـ Migrations)

```
postgresql://postgres.nysajqypudgkwxgxqvlk:D%40X055640050@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

**تفاصيل:**

- **Host:** `aws-1-ap-northeast-2.pooler.supabase.com`
- **Port:** `5432` (Direct Connection)
- **Username:** `postgres.nysajqypudgkwxgxqvlk`
- **Database:** `postgres`

---

## ⚙️ متغيرات البيئة في Vercel

| المتغير                         | البيئات             | الوصف                                      |
| ------------------------------- | ------------------- | ------------------------------------------ |
| `DATABASE_URL`                  | Production, Preview | رابط Connection Pooler (6543)              |
| `DIRECT_URL`                    | Production, Preview | رابط الاتصال المباشر (5432)                |
| `NEXT_PUBLIC_SUPABASE_URL`      | All                 | `https://nysajqypudgkwxgxqvlk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All                 | مفتاح Anon العام                           |

---

## 🔧 الإعدادات التقنية

### Next.js Configuration

```javascript
// next.config.js
{
  basePath: '/Performance',
  output: 'standalone'
}
```

### Prisma Schema

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 📝 المشاكل التي تم حلها

### 1. خطأ الاتصال بقاعدة البيانات

**المشكلة:** `Can't reach database server at db.nysajqypudgkwxgxqvlk.supabase.co:5432`

**السبب:** Vercel Serverless Functions لا تستطيع الاتصال المباشر بـ Supabase Postgres.

**الحل:** استخدام Supabase Connection Pooler على:

- Host: `aws-1-ap-northeast-2.pooler.supabase.com`
- Port: `6543`
- Username: `postgres.nysajqypudgkwxgxqvlk` (مع ref المشروع)

### 2. خطأ في كلمة المرور

**المشكلة:** كلمة المرور تحتوي على `@` مما يسبب خطأ في تحليل URL.

**الحل:** URL-encode الرمز `@` إلى `%40`:

- قبل: `D@X055640050`
- بعد: `D%40X055640050`

### 3. مضيف Pooler خاطئ

**المشكلة:** استخدام `ap-northeast-2.pooler.supabase.com` بدلاً من الصحيح.

**الحل:** استخدام المضيف الصحيح من Supabase Dashboard:

- خاطئ: `ap-northeast-2.pooler.supabase.com`
- صحيح: `aws-1-ap-northeast-2.pooler.supabase.com`

---

## ✅ نتائج الاختبار النهائية

```bash
# Health Check
curl -s https://performance-alpha-nine.vercel.app/Performance/api/health
# النتيجة: {"status":"ok","db":[{"ok":1}]}

# Universities
curl -s https://performance-alpha-nine.vercel.app/Performance/api/universities
# النتيجة: [{"id":"...","name":"جامعة الملك عبد العزيز",...},{"id":"...","name":"جامعة جدة",...}]

# Statistics
curl -s 'https://performance-alpha-nine.vercel.app/Performance/api/statistics?date=2025-12-03'
# النتيجة: {"date":"2025-12-03","totals":{"totalTrips":0,"totalStudents":0,"totalUniversities":2,...},...}
```

---

## 🚀 أوامر النشر

### نشر جديد على Vercel

```bash
vercel --prod --yes
```

### تحديث متغيرات البيئة

```bash
# إزالة القديمة
vercel env rm DATABASE_URL production --yes
vercel env rm DATABASE_URL preview --yes

# إضافة الجديدة
printf '%s' 'postgresql://postgres.nysajqypudgkwxgxqvlk:D%40X055640050@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' | vercel env add DATABASE_URL production
printf '%s' 'postgresql://postgres.nysajqypudgkwxgxqvlk:D%40X055640050@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' | vercel env add DATABASE_URL preview
```

### ربط المشروع

```bash
vercel link --project performance --yes
```

---

## 📌 ملاحظات مهمة

1. **كلمة المرور:** تأكد دائماً من URL-encode أي رموز خاصة في كلمة المرور.

2. **Connection Pooler:** استخدم port 6543 مع `pgbouncer=true` للتطبيق، و port 5432 للـ migrations.

3. **اسم المستخدم:** للـ Pooler استخدم `postgres.<project-ref>` وليس `postgres` فقط.

4. **المنطقة:** تأكد من استخدام المضيف الصحيح للمنطقة من Supabase Dashboard.

5. **حماية النشر:** إذا ظهرت "Authentication Required"، عطّل Deployment Protection من إعدادات Vercel.

---

## 📞 الدعم

- **Supabase Dashboard:** https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk
- **Vercel Dashboard:** https://vercel.com/alkhaledlogs-projects/performance
- **GitHub Issues:** https://github.com/khaledtransport/Performance/issues

---

_آخر تحديث: 3 ديسمبر 2025_
