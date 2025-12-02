import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب جامعة محددة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const university = await prisma.university.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!university) {
      return NextResponse.json(
        { error: "الجامعة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json(university);
  } catch (error: any) {
    console.error("GET /api/universities/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث جامعة
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const updatedUniversity = await prisma.university.update({
      where: { id },
      data: { name },
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("universities:all");

    return NextResponse.json(updatedUniversity);
  } catch (error: any) {
    console.error("PUT /api/universities/[id] error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الجامعة موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطأ في تحديث الجامعة", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف جامعة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma will cascade delete routes based on schema
    await prisma.university.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("universities:all");

    return NextResponse.json({ message: "تم حذف الجامعة بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/universities/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "الجامعة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "خطأ في حذف الجامعة", details: error.message },
      { status: 500 }
    );
  }
}
