import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب سائق محدد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "السائق غير موجود" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error: any) {
    console.error("GET /api/drivers/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث سائق
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone } = body;

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: { name, phone },
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("drivers:all");

    return NextResponse.json(updatedDriver);
  } catch (error: any) {
    console.error("PUT /api/drivers/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في تحديث السائق", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف سائق
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma will cascade delete routes based on schema
    await prisma.driver.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("drivers:all");

    return NextResponse.json({ message: "تم حذف السائق بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/drivers/[id] error:", error);

    // Handle specific error cases
    if (error.code === "P2025") {
      return NextResponse.json({ error: "السائق غير موجود" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف السائق", details: error.message },
      { status: 500 }
    );
  }
}
