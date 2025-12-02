import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: جلب باص محدد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bus = await prisma.bus.findUnique({
      where: { id },
      select: {
        id: true,
        busNumber: true,
        capacity: true,
        createdAt: true,
        updatedAt: true,
        districts: {
          select: {
            id: true,
            districtId: true,
            district: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!bus) {
      return NextResponse.json({ error: "الباص غير موجود" }, { status: 404 });
    }

    return NextResponse.json(bus);
  } catch (error: any) {
    console.error("GET /api/buses/[id] error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث باص
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { busNumber, capacity, districtIds } = body;

    // تحديث البيانات الأساسية
    const updatedBus = await prisma.$transaction(async (tx) => {
      // 1. تحديث بيانات الباص
      const bus = await tx.bus.update({
        where: { id },
        data: {
          busNumber,
          capacity,
        },
      });

      // 2. إذا تم إرسال قائمة أحياء، نقوم بتحديث العلاقات
      if (districtIds) {
        // حذف العلاقات القديمة
        await tx.busDistrict.deleteMany({
          where: { busId: id },
        });

        // إنشاء العلاقات الجديدة
        if (districtIds.length > 0) {
          await tx.busDistrict.createMany({
            data: districtIds.map((distId: string) => ({
              busId: id,
              districtId: distId,
            })),
          });
        }
      }

      // 3. إرجاع الباص مع البيانات المحدثة
      return tx.bus.findUnique({
        where: { id },
        include: {
          districts: {
            include: {
              district: true,
            },
          },
        },
      });
    });

    // بطّل الكاش بعد التحديث
    apiCache.delete("buses:all");

    return NextResponse.json(updatedBus);
  } catch (error: any) {
    console.error("PUT /api/buses/[id] error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "رقم الباص موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطأ في تحديث الباص", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف باص
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma will cascade delete routes based on schema
    await prisma.bus.delete({
      where: { id },
    });

    // بطّل الكاش بعد الحذف
    apiCache.delete("buses:all");

    return NextResponse.json({ message: "تم حذف الباص بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/buses/[id] error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "الباص غير موجود" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "خطأ في حذف الباص", details: error.message },
      { status: 500 }
    );
  }
}
