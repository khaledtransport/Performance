import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });

// Add middleware for performance monitoring
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    if (e.duration > 1000) {
      console.warn(`⚠️ Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
