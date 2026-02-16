import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
        url: process.env.DATABASE_URL,
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
