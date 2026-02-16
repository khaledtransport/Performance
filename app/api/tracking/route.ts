import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: الحصول على مواقع الباصات الحالية
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busId = searchParams.get("busId");

    if (busId) {
      // موقع باص محدد مع آخر 50 موقع للمسار
      const locations = await prisma.busLocation.findMany({
        where: { busId },
        orderBy: { timestamp: "desc" },
        take: 50,
        include: { bus: true },
      });
      return NextResponse.json(locations);
    }

    // استخدام الكاش (5 ثوان) لتقليل ضغط قاعدة البيانات
    const cacheKey = "tracking:all";
    const cached = apiCache.get<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // آخر موقع لكل باص نشط
    const buses = await prisma.bus.findMany({
      where: { isActive: true },
      include: {
        locations: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        districts: {
          include: { district: true },
        },
      },
    });

    // عرض جميع الباصات، حتى التي بدون موقع
    const busLocations = buses.map((bus) => {
      const hasLocation = bus.locations.length > 0;
      const loc = hasLocation ? bus.locations[0] : null;
      
      return {
        busId: bus.id,
        busNumber: bus.busNumber,
        district: bus.districts[0]?.district?.name || "غير محدد",
        latitude: loc?.latitude ?? 21.4858, // موقع افتراضي: جدة
        longitude: loc?.longitude ?? 39.1925,
        speed: loc?.speed ?? 0,
        heading: loc?.heading ?? 0,
        lastUpdate: loc?.timestamp ?? bus.createdAt,
        isOnline: hasLocation && 
          new Date().getTime() - new Date(loc!.timestamp).getTime() <
          5 * 60 * 1000, // آخر 5 دقائق
        hasLocation, // هل يوجد موقع حقيقي
      };
    });

    // كاش 5 ثوان لتقليل ضغط DB عند عدة مستخدمين يتتبعون
    apiCache.set(cacheKey, busLocations, 5000);

    return NextResponse.json(busLocations, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Tracking GET error:", error);
    return NextResponse.json(
      { error: "فشل جلب بيانات التتبع" },
      { status: 500 }
    );
  }
}

// POST: تحديث موقع باص
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { busId, latitude, longitude, speed, heading, accuracy } = body;

    if (!busId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "معرّف الباص والإحداثيات مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من وجود الباص
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return NextResponse.json(
        { error: "الباص غير موجود" },
        { status: 404 }
      );
    }

    const location = await prisma.busLocation.create({
      data: {
        busId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed ? parseFloat(speed) : 0,
        heading: heading ? parseFloat(heading) : 0,
        accuracy: accuracy ? parseFloat(accuracy) : null,
      },
    });

    // إبطال كاش التتبع عند تحديث الموقع
    apiCache.delete("tracking:all");

    // حذف المواقع القديمة (أكثر من 24 ساعة) — بشكل غير متزامن
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prisma.busLocation.deleteMany({
      where: {
        busId,
        timestamp: { lt: oneDayAgo },
      },
    }).catch(() => {}); // لا تنتظر الحذف

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Tracking POST error:", error);
    return NextResponse.json(
      { error: "فشل تحديث الموقع" },
      { status: 500 }
    );
  }
}
