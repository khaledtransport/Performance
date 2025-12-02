import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TripStatus, TripDirection } from "@prisma/client";
import { apiCache } from "@/lib/cache";

// مدة صلاحية الكاش (30 ثانية)
const CACHE_TTL = 30 * 1000;

// GET: جلب الرحلات اليومية (من جدولي trips و route_trips) - مع كاش
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const busId = searchParams.get("busId");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const source = searchParams.get("source"); // 'trips', 'route_trips', or 'all' (default)

    // إنشاء مفتاح الكاش
    const cacheKey = `trips:${date || ""}:${startDateParam || ""}:${
      endDateParam || ""
    }:${busId || ""}:${status || ""}:${direction || ""}:${source || ""}`;

    // محاولة جلب من الكاش
    const cachedData = apiCache.get<any[]>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // بناء شروط التصفية
    let dateFilter: any = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (startDateParam && endDateParam) {
      const startRange = new Date(startDateParam);
      const endRange = new Date(endDateParam);
      dateFilter = { gte: startRange, lte: endRange };
    }

    const allTrips: any[] = [];

    // جلب من جدول trips (الجديد) - includes مُبسطة
    if (source !== "route_trips") {
      const tripsWhereClause: any = {};
      if (Object.keys(dateFilter).length > 0)
        tripsWhereClause.tripDate = dateFilter;
      if (busId) tripsWhereClause.busId = busId;
      if (status) tripsWhereClause.status = status as TripStatus;
      if (direction) tripsWhereClause.direction = direction as TripDirection;

      const trips = await prisma.trip.findMany({
        where: tripsWhereClause,
        select: {
          id: true,
          tripDate: true,
          direction: true,
          scheduledTime: true,
          passengersCount: true,
          status: true,
          notes: true,
          busId: true,
          bus: {
            select: {
              id: true,
              busNumber: true,
              districts: {
                select: {
                  district: { select: { id: true, name: true } },
                },
              },
            },
          },
          route: {
            select: {
              university: { select: { id: true, name: true } },
              driver: { select: { id: true, name: true, phone: true } },
              district: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ tripDate: "desc" }, { scheduledTime: "asc" }],
      });

      // تحويل trips للصيغة الموحدة
      for (const trip of trips) {
        // جلب الأحياء: من route.district أولاً، وإذا فارغ من bus.districts (جميعها)
        const districtFromRoute = trip.route?.district;
        const districtsFromBus =
          trip.bus?.districts?.map((d) => d.district) || [];
        const districts = districtFromRoute
          ? [districtFromRoute]
          : districtsFromBus;

        allTrips.push({
          id: trip.id,
          source: "trips",
          tripDate: trip.tripDate,
          direction: trip.direction,
          tripTime: trip.scheduledTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          studentsCount: trip.passengersCount,
          status: trip.status,
          notes: trip.notes,
          route: {
            bus: { id: trip.busId, busNumber: trip.bus?.busNumber },
            driver: trip.route?.driver || null,
            university: trip.route?.university || null,
            district: districts[0] || null, // للتوافق مع الكود القديم
            districts: districts, // جميع الأحياء
          },
        });
      }
    }

    // جلب من جدول route_trips (القديم) - includes مُبسطة
    if (source !== "trips") {
      const routeTripsWhereClause: any = {};
      if (Object.keys(dateFilter).length > 0)
        routeTripsWhereClause.tripDate = dateFilter;
      if (status) routeTripsWhereClause.status = status as TripStatus;
      if (direction)
        routeTripsWhereClause.direction = direction as TripDirection;

      const routeTrips = await prisma.routeTrip.findMany({
        where: routeTripsWhereClause,
        select: {
          id: true,
          tripDate: true,
          direction: true,
          tripTime: true,
          studentsCount: true,
          status: true,
          routeId: true,
          route: {
            select: {
              busId: true,
              university: { select: { id: true, name: true } },
              driver: { select: { id: true, name: true, phone: true } },
              bus: {
                select: {
                  id: true,
                  busNumber: true,
                  districts: {
                    select: {
                      district: { select: { id: true, name: true } },
                    },
                  },
                },
              },
              district: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ tripDate: "desc" }, { tripTime: "asc" }],
      });

      // تحويل route_trips للصيغة الموحدة
      for (const rt of routeTrips) {
        // تصفية حسب busId إن وجد
        if (busId && rt.route?.busId !== busId) continue;

        // جلب الأحياء: من route.district أولاً، وإذا فارغ من bus.districts (جميعها)
        const districtFromRoute = rt.route?.district;
        const districtsFromBus =
          rt.route?.bus?.districts?.map((d) => d.district) || [];
        // إذا كان هناك حي في المسار نستخدمه، وإلا نستخدم أحياء الباص
        const districts = districtFromRoute
          ? [districtFromRoute]
          : districtsFromBus;

        allTrips.push({
          id: rt.id,
          source: "route_trips",
          tripDate: rt.tripDate,
          direction: rt.direction,
          tripTime: rt.tripTime,
          studentsCount: rt.studentsCount,
          status: rt.status,
          notes: null,
          route: {
            id: rt.routeId,
            bus: rt.route?.bus
              ? { id: rt.route.bus.id, busNumber: rt.route.bus.busNumber }
              : null,
            driver: rt.route?.driver || null,
            university: rt.route?.university || null,
            district: districts[0] || null, // للتوافق مع الكود القديم
            districts: districts, // جميع الأحياء
          },
        });
      }
    }

    // ترتيب النتائج حسب التاريخ والوقت
    allTrips.sort((a, b) => {
      const dateA = new Date(a.tripDate).getTime();
      const dateB = new Date(b.tripDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (a.tripTime || "").localeCompare(b.tripTime || "");
    });

    // حفظ في الكاش
    apiCache.set(cacheKey, allTrips, CACHE_TTL);

    return NextResponse.json(allTrips, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      {
        error: "خطأ في جلب البيانات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

// POST: إضافة رحلة يومية جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      busId,
      routeId,
      tripDate,
      direction,
      scheduledTime,
      passengersCount,
      status,
      notes,
    } = body;

    // إذا تم تمرير routeId، نتحقق من وجوده ونجلب busId منه
    let finalBusId = busId;
    if (routeId) {
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        select: { busId: true },
      });
      if (route) {
        finalBusId = route.busId;
      }
    }

    if (!finalBusId || !tripDate || !direction || !scheduledTime) {
      return NextResponse.json(
        {
          error:
            "الحقول المطلوبة: routeId (أو busId), tripDate, direction, scheduledTime",
        },
        { status: 400 }
      );
    }

    // تحويل الوقت إلى كائن Date
    const timeParts = scheduledTime.split(":");
    const scheduledDateTime = new Date(tripDate);
    scheduledDateTime.setHours(
      parseInt(timeParts[0]),
      parseInt(timeParts[1]),
      0
    );

    const newTrip = await prisma.trip.create({
      data: {
        busId: finalBusId,
        routeId: routeId || undefined,
        tripDate: new Date(tripDate),
        direction: direction as TripDirection,
        scheduledTime: scheduledDateTime,
        passengersCount: passengersCount || 0,
        status: status || "PENDING",
        notes,
      },
      include: {
        bus: true,
        route: true,
      },
    });

    // إبطال الكاش عند إضافة رحلة جديدة
    apiCache.invalidatePrefix("trips:");

    return NextResponse.json(newTrip, { status: 201 });
  } catch (error: any) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "خطأ في إضافة الرحلة", details: error.message },
      { status: 500 }
    );
  }
}
