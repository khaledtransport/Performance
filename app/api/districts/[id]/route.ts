import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب حي محدد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const district = await prisma.district.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!district) {
      return NextResponse.json({ error: "الحي غير موجود" }, { status: 404 });
    }

    return NextResponse.json(district);
  } catch (error: any) {
    console.error("GET /api/districts/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث حي
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description } = await request.json();

    const updatedDistrict = await prisma.district.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("districts:all");

    return NextResponse.json(updatedDistrict);
  } catch (error: any) {
    console.error("PUT /api/districts/[id] error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الحي موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطأ في تحديث الحي", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف حي
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.district.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("districts:all");

    return NextResponse.json({ success: true, message: "تم حذف الحي بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/districts/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "الحي غير موجود" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف الحي", details: error.message },
      { status: 500 }
    );
  }
}
