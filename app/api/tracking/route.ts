import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";

// GET: الحصول على مواقع الباصات الحالية
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busId = searchParams.get("busId");

    if (busId) {
      try {
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
      } catch (sessionError) {
        console.error("Tracking GET session query fallback:", sessionError);
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

    const now = Date.now();
    const activeSessionThreshold = new Date(now - 30 * 1000); // 30 ثانية لعرض أسرع لحالة الاتصال
    let activeBusSet = new Set<string>();

    try {
      const activeSessions = await prisma.trackingSession.findMany({
        where: {
          status: "ACTIVE",
          endedAt: null,
          lastPointAt: { gte: activeSessionThreshold },
        },
        select: { busId: true },
      });
      activeBusSet = new Set(activeSessions.map((s) => s.busId));
    } catch (activeError) {
      console.error("Tracking GET active sessions fallback:", activeError);
    }

    let busLocations: Array<{
      busId: string;
      busNumber: string;
      district: string;
      latitude: number;
      longitude: number;
      speed: number | null;
      heading: number | null;
      accuracy: number | null;
      lastUpdate: Date;
      isOnline: boolean;
      hasLocation: boolean;
      isCellTower: boolean;
    }>;

    try {
      // آخر موقع لكل باص نشط
      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        include: {
          locations: {
            orderBy: { timestamp: "desc" },
            take: 12,
          },
          districts: {
            include: { district: true },
          },
        },
      });

      // عرض جميع الباصات، حتى التي بدون موقع
      busLocations = buses.map((bus) => {
        const hasLocation = bus.locations.length > 0;
        const latestLoc = hasLocation ? bus.locations[0] : null;
        const loc = latestLoc;

        return {
          busId: bus.id,
          busNumber: bus.busNumber,
          district: bus.districts[0]?.district?.name || "غير محدد",
          latitude: loc?.latitude ?? 21.4858,
          longitude: loc?.longitude ?? 39.1925,
          speed: loc?.speed ?? 0,
          heading: loc?.heading ?? null,
          accuracy: latestLoc?.accuracy ?? null,
          lastUpdate: latestLoc?.timestamp ?? bus.createdAt,
          isOnline: activeBusSet.has(bus.id),
          hasLocation,
          isCellTower: latestLoc?.accuracy != null && latestLoc.accuracy >= 300,
        };
      });
    } catch (busesError) {
      console.error("Tracking GET buses query fallback:", busesError);

      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        select: {
          id: true,
          busNumber: true,
          createdAt: true,
        },
      });

      const latestLocations = await Promise.all(
        buses.map(async (bus) => {
          const latestLoc = await prisma.busLocation.findFirst({
            where: { busId: bus.id },
            orderBy: { timestamp: "desc" },
            select: {
              latitude: true,
              longitude: true,
              speed: true,
              heading: true,
              accuracy: true,
              timestamp: true,
            },
          });

          return { bus, latestLoc };
        })
      );

      busLocations = latestLocations.map(({ bus, latestLoc }) => {
        const hasLocation = !!latestLoc;

        return {
          busId: bus.id,
          busNumber: bus.busNumber,
          district: "غير محدد",
          latitude: latestLoc?.latitude ?? 21.4858,
          longitude: latestLoc?.longitude ?? 39.1925,
          speed: latestLoc?.speed ?? 0,
          heading: latestLoc?.heading ?? null,
          accuracy: latestLoc?.accuracy ?? null,
          lastUpdate: latestLoc?.timestamp ?? bus.createdAt,
          isOnline: activeBusSet.has(bus.id),
          hasLocation,
          isCellTower: latestLoc?.accuracy != null && latestLoc.accuracy >= 300,
        };
      });
    }

    // كاش 2 ثانية لتقليل ضغط DB مع استجابة سريعة للتحديثات
    apiCache.set(cacheKey, busLocations, 2000);

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

// PATCH: تحديث حالة التتبع (بدء/إيقاف) بشكل لحظي
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { busId, action } = body as { busId?: string; action?: "start" | "stop" };
    const currentUser = await getCurrentUser();

    if (!busId || !action) {
      return NextResponse.json(
        { error: "busId و action مطلوبان" },
        { status: 400 }
      );
    }

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      select: {
        id: true,
        busNumber: true,
        districts: {
          where: { isActive: true },
          take: 1,
          select: {
            district: {
              select: { name: true },
            },
          },
        },
        assignments: {
          where: { isActive: true },
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!bus) {
      return NextResponse.json({ error: "الباص غير موجود" }, { status: 404 });
    }

    const assignedDriver = bus.assignments[0]?.driver;
    const driverName = currentUser?.fullName || assignedDriver?.name || "غير معروف";
    const driverUsername = currentUser?.username || assignedDriver?.user?.username || "-";
    const driverPhone = assignedDriver?.phone || "-";
    const districtName = bus.districts[0]?.district?.name || "غير محدد";

    const notifyAdmins = async (status: "ACTIVE" | "ENDED") => {
      const adminUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["ADMIN", "MANAGER"] },
        },
        select: { id: true },
      });

      if (adminUsers.length === 0) return;

      const isStart = status === "ACTIVE";
      const title = isStart ? "بدء تتبع السائق" : "إيقاف تتبع السائق";
      const message = [
        `السائق: ${driverName} (${driverUsername})`,
        `رقم الجوال: ${driverPhone}`,
        `الباص: ${bus.busNumber}`,
        `الحي: ${districtName}`,
        `الحالة: ${isStart ? "بدأ التتبع المباشر" : "أوقف التتبع المباشر"}`,
        `الوقت: ${now.toLocaleString("ar-SA")}`,
      ].join("\n");

      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          title,
          message,
          type: "TRIP_UPDATE",
          priority: isStart ? "NORMAL" : "HIGH",
          soundType: isStart ? "default" : "alert",
          senderId: currentUser?.userId || assignedDriver?.user?.id || null,
          link: "/Performance/dashboard",
        })),
      });
    };

    const now = new Date();

    if (action === "stop") {
      await prisma.trackingSession.updateMany({
        where: {
          busId,
          status: "ACTIVE",
          endedAt: null,
        },
        data: {
          status: "ENDED",
          endedAt: now,
          lastPointAt: now,
        },
      });

      await notifyAdmins("ENDED");

      apiCache.delete("tracking:all");
      return NextResponse.json({ success: true, status: "ENDED" });
    }

    // action === "start"
    const existing = await prisma.trackingSession.findFirst({
      where: {
        busId,
        status: "ACTIVE",
        endedAt: null,
      },
      orderBy: { lastPointAt: "desc" },
      select: { id: true },
    });

    if (!existing) {
      const activeRoute = await prisma.route.findFirst({
        where: { busId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      await prisma.trackingSession.create({
        data: {
          busId,
          routeId: activeRoute?.id ?? null,
          startedAt: now,
          lastPointAt: now,
          status: "ACTIVE",
          source: "DRIVER_APP",
        },
      });

      await notifyAdmins("ACTIVE");
    } else {
      await prisma.trackingSession.update({
        where: { id: existing.id },
        data: { lastPointAt: now },
      });
    }

    apiCache.delete("tracking:all");
    return NextResponse.json({ success: true, status: "ACTIVE" });
  } catch (error) {
    console.error("Tracking PATCH error:", error);
    return NextResponse.json(
      { error: "فشل تحديث حالة التتبع" },
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
