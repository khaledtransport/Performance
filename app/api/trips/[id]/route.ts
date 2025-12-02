import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب رحلة يومية محددة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: {
        id: true,
        busId: true,
        tripDate: true,
        direction: true,
        scheduledTime: true,
        actualDepartureTime: true,
        actualArrivalTime: true,
        status: true,
        passengersCount: true,
        notes: true,
        routeId: true,
        createdAt: true,
        updatedAt: true,
        bus: {
          select: {
            id: true,
            busNumber: true,
            capacity: true,
            districts: {
              select: {
                id: true,
                districtId: true,
                district: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "الرحلة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error: any) {
    console.error("GET /api/trips/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث رحلة يومية
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      passengersCount,
      status,
      scheduledTime,
      actualDepartureTime,
      actualArrivalTime,
      notes,
    } = body;

    const updateData: any = {};
    if (passengersCount !== undefined)
      updateData.passengersCount = passengersCount;
    if (status) updateData.status = status;
    if (scheduledTime) updateData.scheduledTime = new Date(scheduledTime);
    if (actualDepartureTime !== undefined)
      updateData.actualDepartureTime = actualDepartureTime
        ? new Date(actualDepartureTime)
        : null;
    if (actualArrivalTime !== undefined)
      updateData.actualArrivalTime = actualArrivalTime
        ? new Date(actualArrivalTime)
        : null;
    if (notes !== undefined) updateData.notes = notes;

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        bus: true,
      },
    });

    // بطّل الكاش بعد التحديث
    apiCache.invalidatePrefix("trips:");

    return NextResponse.json(updatedTrip);
  } catch (error: any) {
    console.error("PUT /api/trips/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في تحديث الرحلة", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف رحلة يومية
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.trip.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.invalidatePrefix("trips:");

    return NextResponse.json({ message: "تم حذف الرحلة بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/trips/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "الرحلة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف الرحلة", details: error.message },
      { status: 500 }
    );
  }
}
