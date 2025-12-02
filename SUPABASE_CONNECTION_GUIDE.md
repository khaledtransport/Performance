# 🔐 دليل الاتصال بـ Supabase - نظام النقل الجامعي

## 📋 معلومات المشروع

| الحقل            | القيمة                     |
| ---------------- | -------------------------- |
| **Project Name** | University travel schedule |
| **Project ID**   | `nysajqypudgkwxgxqvlk`     |
| **Region**       | Northeast Asia (Seoul)     |
| **Created**      | 2025-11-18                 |

---

## 🔑 المفاتيح والاتصالات

### 1️⃣ Database URL (Prisma/Direct Connection)

```env
DATABASE_URL="postgresql://postgres:D@X055640050@db.nysajqypudgkwxgxqvlk.supabase.co:5432/postgres"
```

**الاستخدام:** Prisma ORM, أي ORM آخر, اتصال مباشر

**مثال Node.js:**

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// استخدام
const users = await prisma.universities.findMany();
```

---

### 2️⃣ PostgreSQL Direct (psql/pgAdmin)

| الحقل        | القيمة                                |
| ------------ | ------------------------------------- |
| **Host**     | `db.nysajqypudgkwxgxqvlk.supabase.co` |
| **Port**     | `5432`                                |
| **Database** | `postgres`                            |
| **User**     | `postgres`                            |
| **Password** | `D@X055640050`                        |

**أمر الاتصال:**

```bash
PGPASSWORD='D@X055640050' psql -h db.nysajqypudgkwxgxqvlk.supabase.co -U postgres -d postgres
```

**Connection String:**

```
postgresql://postgres:D@X055640050@db.nysajqypudgkwxgxqvlk.supabase.co:5432/postgres
```

---

### 3️⃣ Supabase JavaScript Client

#### 🌐 للمتصفح (Client-side) - Anon Key

```env
NEXT_PUBLIC_SUPABASE_URL="https://nysajqypudgkwxgxqvlk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2FqcXlwdWRna3d4Z3hxdmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTE1NTgsImV4cCI6MjA3OTA2NzU1OH0.lqtmosiIKzvpu1OGWbHmcFdMlgMJ5h8QhY8goylquMA"
```

**الاستخدام:**

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nysajqypudgkwxgxqvlk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2FqcXlwdWRna3d4Z3hxdmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTE1NTgsImV4cCI6MjA3OTA2NzU1OH0.lqtmosiIKzvpu1OGWbHmcFdMlgMJ5h8QhY8goylquMA"
);

// استخدام
const { data } = await supabase.from("universities").select("*");
```

⚠️ **ملاحظة:** هذا المفتاح آمن للاستخدام في المتصفح، لكنه يخضع لسياسات RLS.

---

#### 🔒 للسيرفر (Server-side) - Service Role Key

```env
SUPABASE_URL="https://nysajqypudgkwxgxqvlk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2FqcXlwdWRna3d4Z3hxdmxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ5MTU1OCwiZXhwIjoyMDc5MDY3NTU4fQ.UzjPIqQdWGzvjZiiGZvnaxFuldkKFaQNzrW--Rnt-e8"
```

**الاستخدام:**

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  "https://nysajqypudgkwxgxqvlk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2FqcXlwdWRna3d4Z3hxdmxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ5MTU1OCwiZXhwIjoyMDc5MDY3NTU4fQ.UzjPIqQdWGzvjZiiGZvnaxFuldkKFaQNzrW--Rnt-e8"
);

// يتجاوز RLS - استخدم فقط في السيرفر!
const { data } = await supabaseAdmin.from("universities").select("*");
```

🚨 **تحذير:** لا تستخدم هذا المفتاح في المتصفح أبداً!

---

### 4️⃣ Supabase MCP (Model Context Protocol)

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp",
      "projectId": "nysajqypudgkwxgxqvlk",
      "headers": {
        "Authorization": "Bearer sb_secret_7T1wFNGYzXBe3Mwol92e2Q_7PqBXby4"
      }
    }
  }
}
```

**الموقع:** `.cursor/mcp.json` أو `~/.cursor/mcp.json`

---

### 5️⃣ Supabase CLI

```bash
# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref nysajqypudgkwxgxqvlk

# عرض المشاريع
supabase projects list

# تنفيذ SQL
supabase db dump --linked
```

---

## 🔗 روابط مهمة

| الرابط                                                                                     | الوصف            |
| ------------------------------------------------------------------------------------------ | ---------------- |
| [Dashboard](https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk)                   | لوحة التحكم      |
| [SQL Editor](https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk/sql)              | محرر SQL         |
| [Table Editor](https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk/editor)         | محرر الجداول     |
| [API Docs](https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk/api)                | توثيق API        |
| [Auth Settings](https://supabase.com/dashboard/project/nysajqypudgkwxgxqvlk/auth/policies) | إعدادات المصادقة |

---

## 📊 حالة الجداول الحالية

| الجدول          | RLS     | السجلات |
| --------------- | ------- | ------- |
| universities    | ❌ معطل | 4       |
| drivers         | ❌ معطل | 5       |
| buses           | ❌ معطل | 5       |
| districts       | ❌ معطل | 5       |
| representatives | ❌ معطل | 3       |
| routes          | ❌ معطل | 4       |
| route_trips     | ❌ معطل | 102     |
| trips           | ❌ معطل | 4       |
| bus_districts   | ❌ معطل | -       |

---

## 🔐 أنواع المفاتيح

### Anon Key (العام)

- ✅ آمن للمتصفح
- ✅ يخضع لـ RLS
- ✅ للعمليات العامة (قراءة، تسجيل دخول)

### Service Role Key (الخدمة)

- ❌ للسيرفر فقط
- ❌ يتجاوز RLS
- ✅ للعمليات الإدارية

### Database Password

- ❌ للسيرفر فقط
- ❌ اتصال مباشر بقاعدة البيانات
- ✅ صلاحيات كاملة

---

## 🛡️ أفضل الممارسات

### 1. في Next.js

```typescript
// lib/supabase-client.ts (للمتصفح)
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```typescript
// lib/supabase-server.ts (للسيرفر)
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 2. في ملف .env

```env
# Client-side (يظهر في المتصفح)
NEXT_PUBLIC_SUPABASE_URL="https://nysajqypudgkwxgxqvlk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Server-side (لا يظهر في المتصفح)
SUPABASE_URL="https://nysajqypudgkwxgxqvlk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
DATABASE_URL="postgresql://..."
```

### 3. في .gitignore

```gitignore
# لا ترفع ملف .env
.env
.env.local
.env.production
```

---

## 🧪 اختبار الاتصال

### اختبار Prisma

```bash
npx prisma db pull
```

### اختبار psql

```bash
PGPASSWORD='D@X055640050' psql -h db.nysajqypudgkwxgxqvlk.supabase.co -U postgres -d postgres -c "SELECT 1;"
```

### اختبار Supabase Client

```javascript
const { data, error } = await supabase.from("universities").select("count");
console.log(data, error);
```

---

## 📝 ملاحظات إضافية

1. **انتهاء الصلاحية:** المفاتيح JWT تنتهي في `2079-06-07` (تقريباً 54 سنة)

2. **المنطقة الزمنية:** السيرفر في Seoul، لكن التطبيق يستخدم UTC

3. **الحد الأقصى:** الخطة المجانية تدعم:

   - 500 MB قاعدة بيانات
   - 2 GB bandwidth
   - 50,000 monthly active users

4. **النسخ الاحتياطي:** يتم تلقائياً كل يوم

---

## 🆘 استكشاف الأخطاء

### خطأ: "Invalid API key"

- تأكد من استخدام المفتاح الصحيح (anon vs service_role)

### خطأ: "Row Level Security"

- RLS معطل حالياً، لكن إذا فعلته تأكد من إضافة سياسات

### خطأ: "Connection refused"

- تأكد من صحة Host و Port
- تأكد من أن IP غير محظور

### خطأ: "Password authentication failed"

- تأكد من كلمة المرور (قد تحتوي على رموز خاصة)

---

📅 آخر تحديث: 25 نوفمبر 2025
