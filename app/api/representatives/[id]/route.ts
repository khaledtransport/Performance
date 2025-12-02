import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب مندوب محدد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const representative = await prisma.representative.findUnique({
      where: { id },
    });

    if (!representative) {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(representative);
  } catch (error: any) {
    console.error("GET /api/representatives/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث مندوب
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, email } = body;

    const updatedRepresentative = await prisma.representative.update({
      where: { id },
      data: { name, phone, email },
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("representatives:all");

    return NextResponse.json(updatedRepresentative);
  } catch (error: any) {
    console.error("PUT /api/representatives/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في تحديث المندوب", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE حذف مندوب
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.representative.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("representatives:all");

    return NextResponse.json({ message: "تم حذف المندوب بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/representatives/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "المندوب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف المندوب", details: error.message },
      { status: 500 }
    );
  }
}
