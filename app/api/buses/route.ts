import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 دقائق

// GET: جلب جميع الباصات مع الأحياء
export async function GET() {
  try {
    // محاولة جلب من الكاش أولاً
    const cacheKey = "buses:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const buses = await prisma.bus.findMany({
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
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        busNumber: "asc",
      },
    });

    // حفظ في الكاش
    apiCache.set(cacheKey, buses, CACHE_TTL);

    return NextResponse.json(buses);
  } catch (error) {
    console.error("buses GET error:", error);
    return NextResponse.json(
      {
        error: "خطأ في جلب البيانات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

// POST: إضافة باص جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { busNumber, capacity, districtIds } = body;

    if (!busNumber) {
      return NextResponse.json({ error: "رقم الباص مطلوب" }, { status: 400 });
    }

    const newBus = await prisma.bus.create({
      data: {
        busNumber,
        capacity: capacity || 50,
        districts: {
          create:
            districtIds?.map((id: string) => ({
              districtId: id,
            })) || [],
        },
      },
      include: {
        districts: {
          include: {
            district: true,
          },
        },
      },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("buses:all");

    return NextResponse.json(newBus, { status: 201 });
  } catch (error: any) {
    console.error("Error adding bus:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "رقم الباص موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطأ في إضافة الباص", details: error.message },
      { status: 500 }
    );
  }
}
