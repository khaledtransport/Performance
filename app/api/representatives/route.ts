import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب جميع المناديب
export async function GET() {
  try {
    const representatives = await prisma.representative.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(representatives);
  } catch (error: any) {
    console.error("GET /api/representatives error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// POST: إضافة مندوب جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المندوب مطلوب" }, { status: 400 });
    }

    const newRepresentative = await prisma.representative.create({
      data: { name, phone, email },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("representatives:all");

    return NextResponse.json(newRepresentative, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/representatives error:", error);
    return NextResponse.json(
      { error: "خطأ في إضافة المندوب", details: error.message },
      { status: 500 }
    );
  }
}
