import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

// GET: الحصول على مواقع الباصات الحالية
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busId = searchParams.get("busId");

    if (busId) {
      // موقع باص محدد مع آخر 120 نقطة من سجل المسارات الجديد
      const session = await prisma.trackingSession.findFirst({
        where: { busId, status: "ACTIVE", endedAt: null },
        orderBy: { lastPointAt: "desc" },
        select: { id: true },
      });

      if (session) {
        const points = await prisma.trackingPoint.findMany({
          where: { sessionId: session.id },
          orderBy: { timestamp: "desc" },
          take: 120,
          select: {
            id: true,
            latitude: true,
            longitude: true,
            speed: true,
            heading: true,
            accuracy: true,
            timestamp: true,
            busId: true,
          },
        });

        if (points.length > 0) {
          return NextResponse.json(points);
        }
      }

      // fallback للتوافق مع البيانات القديمة
      const locations = await prisma.busLocation.findMany({
        where: { busId },
        orderBy: { timestamp: "desc" },
        take: 120,
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
        heading: loc?.heading ?? null,
        accuracy: loc?.accuracy ?? null,
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

    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);
    const parsedSpeed = speed !== undefined && speed !== null ? parseFloat(speed) : 0;
    const parsedHeading =
      heading !== undefined && heading !== null && Number.isFinite(parseFloat(heading))
        ? ((parseFloat(heading) % 360) + 360) % 360
        : null;
    const parsedAccuracy = accuracy ? parseFloat(accuracy) : null;

    const location = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // جلب المسار النشط الحالي للباص (إن وجد)
      const activeRoute = await tx.route.findFirst({
        where: { busId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      let session = await tx.trackingSession.findFirst({
        where: { busId, status: "ACTIVE", endedAt: null },
        orderBy: { lastPointAt: "desc" },
      });

      // إذا كانت آخر نقطة قديمة (30 دقيقة) نغلق الجلسة ونبدأ جلسة جديدة
      if (session) {
        const idleMs = now.getTime() - new Date(session.lastPointAt).getTime();
        if (idleMs > 30 * 60 * 1000) {
          await tx.trackingSession.update({
            where: { id: session.id },
            data: { status: "ENDED", endedAt: now },
          });
          session = null;
        }
      }

      if (!session) {
        session = await tx.trackingSession.create({
          data: {
            busId,
            routeId: activeRoute?.id ?? null,
            startedAt: now,
            lastPointAt: now,
            status: "ACTIVE",
            source: "DRIVER_APP",
          },
        });
      }

      // حفظ متوافق مع النظام الحالي
      const createdLocation = await tx.busLocation.create({
        data: {
          busId,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          speed: parsedSpeed,
          heading: parsedHeading,
          accuracy: parsedAccuracy,
        },
      });

      // حفظ احترافي كسجل نقاط مرتبط بجلسة
      await tx.trackingPoint.create({
        data: {
          sessionId: session.id,
          busId,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          speed: parsedSpeed,
          heading: parsedHeading,
          accuracy: parsedAccuracy,
          source: "DRIVER_APP",
        },
      });

      await tx.trackingSession.update({
        where: { id: session.id },
        data: {
          lastPointAt: now,
          routeId: session.routeId ?? activeRoute?.id ?? null,
        },
      });

      return createdLocation;
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
