import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPgPool: Pool | undefined;
};

function buildConnectionUrl(): string {
  // Runtime traffic must use the transaction pooler. DIRECT_URL is reserved
  // for migrations and other Prisma CLI operations.
  const baseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  if (!baseUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL is required");
  }

  return baseUrl;
}

const connectionUrl = buildConnectionUrl();

function getPool() {
  if (globalForPrisma.prismaPgPool) return globalForPrisma.prismaPgPool;

  const pool = new Pool({
    connectionString: connectionUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  pool.on("error", (error) => {
    console.error("Postgres pool error:", error);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPgPool = pool;
  }

  return pool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());

  return new PrismaClient({
    adapter,
    log: [
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
