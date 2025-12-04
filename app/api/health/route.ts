import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Simple DB health check: SELECT 1
    const result = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", db: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "فشل التحقق من الاتصال بقاعدة البيانات",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
