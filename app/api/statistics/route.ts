import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { VIEW_ROLES } from "@/lib/rbac";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 60_000;

// GET: جلب إحصائيات النظام (محسّنة بـ groupBy و aggregate)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiRole(VIEW_ROLES);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");
    const dateParam = searchParams.get("date"); // backward compat

    // دعم نطاق تاريخ كامل
    const todayStr = new Date().toISOString().split("T")[0];
    const fromStr  = fromParam || dateParam || todayStr;
    const toStr    = toParam   || dateParam || todayStr;

    const startDate = new Date(fromStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toStr);
    endDate.setHours(23, 59, 59, 999);

    const targetDate = toStr; // للـ backward compat
    const cacheKey = `statistics:${fromStr}:${toStr}`;
    const cached = apiCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    // Keep the database work in small batches. Supabase session pooling has a
    // low connection cap, and one large Promise.all can exhaust it during dev
    // reloads or when other pages poll notifications at the same time.
    const [
      totalUniversities,
      totalDrivers,
      totalBuses,
      totalDistricts,
    ] = await Promise.all([
      prisma.university.count(),
      prisma.driver.count(),
      prisma.bus.count(),
      prisma.district.count(),
    ]);

    const [
      trips,
      routeTrips,
    ] = await Promise.all([
      prisma.trip.findMany({
        where: { tripDate: { gte: startDate, lte: endDate } },
        select: {
          id: true,
          status: true,
          passengersCount: true,
          routeId: true,
        },
      }),
      prisma.routeTrip.findMany({
        where: { tripDate: { gte: startDate, lte: endDate } },
        select: { id: true, status: true, studentsCount: true, routeId: true },
      }),
    ]);

    // تجميع البيانات
    const statusCounts = {
      PENDING: 0,
      DEPARTED: 0,
      ARRIVED: 0,
      DELAYED: 0,
      CANCELLED: 0,
    } as Record<string, number>;

    for (const trip of trips) {
      if (trip.status && Object.hasOwn(statusCounts, trip.status)) {
        statusCounts[trip.status]++;
      }
    }
    for (const trip of routeTrips) {
      if (trip.status && Object.hasOwn(statusCounts, trip.status)) {
        statusCounts[trip.status]++;
      }
    }

    const totalStudents =
      trips.reduce((sum, trip) => sum + (trip.passengersCount || 0), 0) +
      routeTrips.reduce((sum, trip) => sum + (trip.studentsCount || 0), 0);

    // ثم جلب معلومات السائقين والجامعات بفعالية
    const driverAgg: Record<
      string,
      { id: string; name: string; trips: number; arrived: number }
    > = {};
    const universityAgg: Record<
      string,
      { id: string; name: string; trips: number; students: number }
    > = {};

    // جلب تفاصيل Route فقط للرحلات الموجودة
    const routeIds = new Set<string>([
      ...trips.map((t) => t.routeId).filter(Boolean),
      ...routeTrips.map((rt) => rt.routeId).filter(Boolean),
    ] as string[]);

    if (routeIds.size > 0) {
      const routes = await prisma.route.findMany({
        where: { id: { in: Array.from(routeIds) } },
        select: {
          id: true,
          driver: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      });

      const routeMap = new Map(routes.map((r) => [r.id, r]));

      // معالجة Trips
      for (const t of trips) {
        if (!t.routeId) continue;
        const route = routeMap.get(t.routeId);
        if (!route) continue;

        const driver = route.driver;
        if (driver?.id && driver?.name) {
          if (!driverAgg[driver.id]) {
            driverAgg[driver.id] = {
              id: driver.id,
              name: driver.name,
              trips: 0,
              arrived: 0,
            };
          }
          driverAgg[driver.id].trips++;
          if (t.status === "ARRIVED") driverAgg[driver.id].arrived++;
        }

        const university = route.university;
        if (university?.id && university?.name) {
          if (!universityAgg[university.id]) {
            universityAgg[university.id] = {
              id: university.id,
              name: university.name,
              trips: 0,
              students: 0,
            };
          }
          universityAgg[university.id].trips++;
          universityAgg[university.id].students += t.passengersCount || 0;
        }
      }

      // معالجة RouteTrips
      for (const rt of routeTrips) {
        if (!rt.routeId) continue;
        const route = routeMap.get(rt.routeId);
        if (!route) continue;

        const driver = route.driver;
        if (driver?.id && driver?.name) {
          if (!driverAgg[driver.id]) {
            driverAgg[driver.id] = {
              id: driver.id,
              name: driver.name,
              trips: 0,
              arrived: 0,
            };
          }
          driverAgg[driver.id].trips++;
          if (rt.status === "ARRIVED") driverAgg[driver.id].arrived++;
        }

        const university = route.university;
        if (university?.id && university?.name) {
          if (!universityAgg[university.id]) {
            universityAgg[university.id] = {
              id: university.id,
              name: university.name,
              trips: 0,
              students: 0,
            };
          }
          universityAgg[university.id].trips++;
          universityAgg[university.id].students += rt.studentsCount || 0;
        }
      }
    }

    const driversPerformance = Object.values(driverAgg)
      .map((d) => ({
        driverId: d.id,
        name: d.name,
        trips: d.trips,
        arrived: d.arrived,
        performancePercentage: d.trips
          ? parseFloat(((d.arrived / d.trips) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.performancePercentage - a.performancePercentage);

    const universitiesActivity = Object.values(universityAgg)
      .map((u) => ({
        universityId: u.id,
        name: u.name,
        trips: u.trips,
        students: u.students,
      }))
      .sort((a, b) => b.trips - a.trips);

    const totalTrips = trips.length + routeTrips.length;

    const completionRate = totalTrips
      ? parseFloat(((statusCounts.ARRIVED / totalTrips) * 100).toFixed(1))
      : 0;

    const response = {
      date: targetDate,
      from: fromStr,
      to: toStr,
      totals: {
        totalTrips,
        totalStudents,
        totalUniversities,
        totalDrivers,
        totalBuses,
        totalDistricts,
      },
      statusCounts,
      driversPerformance,
      universitiesActivity,

      // Backward compatibility for reports page (legacy shape)
      totalTrips,
      totalStudents,
      completedTrips: statusCounts.ARRIVED,
      pendingTrips: statusCounts.PENDING,
      delayedTrips: statusCounts.DELAYED,
      cancelledTrips: statusCounts.CANCELLED,
      completionRate,
      driverPerformance: driversPerformance.map((d) => ({
        driverId: d.driverId,
        driverName: d.name,
        totalTrips: d.trips,
        completedTrips: d.arrived,
        performance: d.performancePercentage,
      })),
      universityActivity: universitiesActivity.map((u) => ({
        universityId: u.universityId,
        universityName: u.name,
        totalTrips: u.trips,
        totalStudents: u.students,
      })),
    };

    apiCache.set(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      {
        error: "فشل جلب الإحصائيات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
