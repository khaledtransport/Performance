import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

// Prisma 7: يتطلب adapter بدلاً من datasourceUrl
const adapter = new PrismaPg({ connectionString: connectionUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "stdout", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }], // في الإنتاج: فقط الأخطاء
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
