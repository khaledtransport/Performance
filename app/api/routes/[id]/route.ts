import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب رحلة أساسية محددة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const route = await prisma.route.findUnique({
      where: { id },
      select: {
        id: true,
        universityId: true,
        driverId: true,
        busId: true,
        districtId: true,
        createdAt: true,
        updatedAt: true,
        university: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        bus: { select: { id: true, busNumber: true, capacity: true } },
        district: { select: { id: true, name: true } },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "الرحلة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error: any) {
    console.error("GET /api/routes/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث رحلة أساسية
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      universityId,
      driverId,
      busId,
      districtId,
      totalGoTrips,
      totalReturnTrips,
      isActive,
    } = body;

    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        universityId,
        driverId,
        busId,
        ...(districtId ? { districtId } : {}),
        totalGoTrips,
        totalReturnTrips,
        isActive,
      },
      include: {
        university: true,
        driver: true,
        bus: true,
        district: true,
      },
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("routes:all");

    return NextResponse.json(updatedRoute);
  } catch (error: any) {
    console.error("PUT /api/routes/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في تحديث الرحلة", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف رحلة أساسية
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma will cascade delete route_trips automatically based on schema
    await prisma.route.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("routes:all");

    return NextResponse.json({ message: "تم حذف الرحلة بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/routes/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "الرحلة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف الرحلة", details: error.message },
      { status: 500 }
    );
  }
}
