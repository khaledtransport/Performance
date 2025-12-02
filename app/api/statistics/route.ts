import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: جلب إحصائيات النظام (محسّنة بـ groupBy و aggregate)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // التاريخ المستخدم للتصفية
    const targetDate = date || new Date().toISOString().split("T")[0];
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // جلب جميع البيانات بطريقة محسّنة
    const [
      totalUniversities,
      totalDrivers,
      totalBuses,
      totalDistricts,
      trips,
      routeTrips,
      tripStatusCounts,
      routeTripStatusCounts,
      tripStudentStats,
      routeTripStudentStats,
    ] = await Promise.all([
      prisma.university.count(),
      prisma.driver.count(),
      prisma.bus.count(),
      prisma.district.count(),
      // جلب trips فقط بـ select محدود
      prisma.trip.findMany({
        where: { tripDate: { gte: startDate, lte: endDate } },
        select: {
          id: true,
          status: true,
          passengersCount: true,
          routeId: true,
        },
      }),
      // جلب routeTrips فقط بـ select محدود
      prisma.routeTrip.findMany({
        where: { tripDate: { gte: startDate, lte: endDate } },
        select: { id: true, status: true, studentsCount: true, routeId: true },
      }),
      // إحصائيات الحالات للـ trips
      prisma.trip.groupBy({
        by: ["status"],
        where: { tripDate: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      // إحصائيات الحالات للـ routeTrips
      prisma.routeTrip.groupBy({
        by: ["status"],
        where: { tripDate: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      // إحصائيات الطلاب للـ trips
      prisma.trip.aggregate({
        where: { tripDate: { gte: startDate, lte: endDate } },
        _sum: { passengersCount: true },
      }),
      // إحصائيات الطلاب للـ routeTrips
      prisma.routeTrip.aggregate({
        where: { tripDate: { gte: startDate, lte: endDate } },
        _sum: { studentsCount: true },
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

    // معالجة إحصائيات الحالات
    tripStatusCounts.forEach((s: any) => {
      if (s.status && statusCounts.hasOwnProperty(s.status)) {
        statusCounts[s.status] += s._count;
      }
    });

    routeTripStatusCounts.forEach((s: any) => {
      if (s.status && statusCounts.hasOwnProperty(s.status)) {
        statusCounts[s.status] += s._count;
      }
    });

    const totalStudents =
      (tripStudentStats._sum?.passengersCount || 0) +
      (routeTripStudentStats._sum?.studentsCount || 0);

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
    const routeIds = new Set([
      ...trips.map((t) => t.routeId).filter(Boolean),
      ...routeTrips.map((rt) => rt.routeId).filter(Boolean),
    ]);

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

    return NextResponse.json({
      date: targetDate,
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
    });
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
