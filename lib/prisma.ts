import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// إضافة حدود اتصال مناسبة لـ serverless (Vercel + Supabase pgbouncer)
const dbUrl = process.env.DATABASE_URL || '';
const pooledUrl = dbUrl.includes('connection_limit=')
  ? dbUrl
  : dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=15';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }], // في الإنتاج: فقط الأخطاء
    datasources: {
      db: {
        url: pooledUrl,
      },
    },
  });

// مراقبة الاستعلامات البطيئة في التطوير فقط
if (process.env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: { duration: number; query: string }) => {
    if (e.duration > 500) {
      console.warn(`⚠️ Slow query (${e.duration}ms): ${e.query.substring(0, 100)}`);
    }
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
