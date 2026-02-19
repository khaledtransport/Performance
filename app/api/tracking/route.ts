import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

// مخطط Zod للتحقق من مدخلات POST
const TrackingPostSchema = z.object({
  busId: z.string().uuid("busId يجب أن يكون UUID صحيحا"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speed: z.coerce.number().min(0).max(300).optional().nullable(),
  heading: z.coerce.number().min(0).max(360).optional().nullable(),
  accuracy: z.coerce.number().min(0).max(50000).optional().nullable(),
});

// مخطط Zod لـ PATCH
const TrackingPatchSchema = z.object({
  busId: z.string().uuid("busId يجب أن يكون UUID"),
  action: z.enum(["start", "stop"]),
});

// نوع آخر نقطة تتبع لكل باص (raw SQL DISTINCT ON)
type LatestPoint = {
  bus_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: Date;
};

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
      // آخر نقطة لكل باص باستخدام DISTINCT ON (PostgreSQL) — استعلام واحد فقط
      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        include: {
          districts: { include: { district: true } },
        },
        orderBy: { busNumber: "asc" },
      });

      // آخر نقطة من TrackingPoint لكل باص — استعلام واحد
      const latestTPRaw = await prisma.$queryRaw<LatestPoint[]>`
        SELECT DISTINCT ON (bus_id) bus_id, latitude, longitude, speed, heading, accuracy, timestamp
        FROM tracking_points
        ORDER BY bus_id, timestamp DESC
      `;
      const latestTP = new Map(latestTPRaw.map((p) => [p.bus_id, p]));

      // للباصات بدون TrackingPoint — fallback لـ BusLocation (legacy data)
      const busesWithoutTP = buses.filter((b) => !latestTP.has(b.id)).map((b) => b.id);
      const latestBLMap = new Map<string, LatestPoint>();
      if (busesWithoutTP.length > 0) {
        try {
          const legacyRows = await prisma.$queryRaw<LatestPoint[]>`
            SELECT DISTINCT ON (bus_id) bus_id, latitude, longitude, speed, heading, accuracy, timestamp
            FROM bus_locations
            WHERE bus_id = ANY(${busesWithoutTP}::text[])
            ORDER BY bus_id, timestamp DESC
          `;
          for (const r of legacyRows) latestBLMap.set(r.bus_id, r);
        } catch {
          // صامت — الباصات بدون بيانات ستظهر بإحداثيات جدة
        }
      }

      busLocations = buses.map((bus) => {
        const tp = latestTP.get(bus.id) ?? latestBLMap.get(bus.id) ?? null;
        const hasLocation = tp !== null;
        return {
          busId: bus.id,
          busNumber: bus.busNumber,
          district: bus.districts[0]?.district?.name || "غير محدد",
          latitude: tp?.latitude ?? 21.4858,
          longitude: tp?.longitude ?? 39.1925,
          speed: tp?.speed ?? 0,
          heading: tp?.heading ?? null,
          accuracy: tp?.accuracy ?? null,
          lastUpdate: tp?.timestamp ?? bus.createdAt,
          isOnline: activeBusSet.has(bus.id),
          hasLocation,
          isCellTower: tp?.accuracy != null && tp.accuracy >= 300,
        };
      });
    } catch (busesError) {
      console.error("Tracking GET buses query fallback:", busesError);

      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        select: { id: true, busNumber: true, createdAt: true },
      });

      busLocations = buses.map((bus) => ({
        busId: bus.id,
        busNumber: bus.busNumber,
        district: "غير محدد",
        latitude: 21.4858,
        longitude: 39.1925,
        speed: 0,
        heading: null,
        accuracy: null,
        lastUpdate: bus.createdAt,
        isOnline: activeBusSet.has(bus.id),
        hasLocation: false,
        isCellTower: false,
      }));
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
    const parsed = TrackingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { busId, action } = parsed.data;
    const currentUser = await getCurrentUser();

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
    const activeSessions = await prisma.trackingSession.findMany({
      where: {
        busId,
        status: "ACTIVE",
        endedAt: null,
      },
      orderBy: { lastPointAt: "desc" },
      select: { id: true },
    });

    const existing = activeSessions[0];

    if (activeSessions.length > 1) {
      const duplicateSessionIds = activeSessions.slice(1).map((s) => s.id);
      await prisma.trackingSession.updateMany({
        where: { id: { in: duplicateSessionIds } },
        data: {
          status: "ENDED",
          endedAt: now,
          lastPointAt: now,
        },
      });
    }

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

    // التحقق من المدخلات باستخدام Zod
    const parsed = TrackingPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { busId, latitude, longitude, speed, heading, accuracy } = parsed.data;

    // التحقق من وجود الباص
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return NextResponse.json(
        { error: "الباص غير موجود" },
        { status: 404 }
      );
    }

    const parsedLatitude = latitude;
    const parsedLongitude = longitude;
    const parsedSpeed = speed ?? 0;
    const parsedHeading =
      heading !== undefined && heading !== null && Number.isFinite(heading)
        ? ((heading % 360) + 360) % 360
        : null;
    const parsedAccuracy = accuracy ?? null;

    const location = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // جلب المسار النشط الحالي للباص (إن وجد)
      const activeRoute = await tx.route.findFirst({
        where: { busId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      const activeSessions = await tx.trackingSession.findMany({
        where: { busId, status: "ACTIVE", endedAt: null },
        orderBy: { lastPointAt: "desc" },
      });

      let session: (typeof activeSessions)[number] | null = activeSessions[0] ?? null;

      if (activeSessions.length > 1) {
        const duplicateSessionIds = activeSessions.slice(1).map((s) => s.id);
        await tx.trackingSession.updateMany({
          where: { id: { in: duplicateSessionIds } },
          data: { status: "ENDED", endedAt: now, lastPointAt: now },
        });
      }

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

      // حفظ نقطة التتبع — النظام الجديد فقط (TrackingPoint)
      // ملاحظة: BusLocation لم يعد يُكتب هنا — تحوّلنا لخطاب قاعدة واحدة
      const trackingPoint = await tx.trackingPoint.create({
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

      return trackingPoint;
    });

    // إبطال كاش التتبع عند تحديث الموقع
    apiCache.delete("tracking:all");

    // تنظيف TrackingPoints القديمة (أكثر من 7 أيام) — غير متزامن
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    prisma.trackingPoint.deleteMany({
      where: { busId, timestamp: { lt: sevenDaysAgo } },
    }).catch(() => {});

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Tracking POST error:", error);
    return NextResponse.json(
      { error: "فشل تحديث الموقع" },
      { status: 500 }
    );
  }
}
