import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// استخدام الاتصال المباشر (DIRECT_URL) بدلاً من pgbouncer المعطل
// مع حد اتصال واحد فقط لكل serverless function لتجنب استنزاف الاتصالات
function buildConnectionUrl(): string {
  // تفضيل DIRECT_URL لأن pgbouncer قد يكون مشغولاً
  const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (!baseUrl) return '';
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  const params = 'connection_limit=1&pool_timeout=20&connect_timeout=10';
  
  return baseUrl.includes('connection_limit=') ? baseUrl : baseUrl + separator + params;
}

const connectionUrl = buildConnectionUrl();

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
        url: connectionUrl,
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
