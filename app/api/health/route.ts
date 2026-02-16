import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  const start = Date.now();
  try {
    // فحص خفيف للاتصال بقاعدة البيانات مع timeout
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 AS ok`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB health check timeout (8s)")), 8000)
      ),
    ]);
    return NextResponse.json(
      { status: "ok", db: result, responseTime: Date.now() - start },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        message: "فشل التحقق من الاتصال بقاعدة البيانات",
        details: message,
        responseTime: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
