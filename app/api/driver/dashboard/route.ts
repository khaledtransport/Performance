import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: لوحة تحكم السائق - بياناته فقط
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // جلب المستخدم مع ربط السائق
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        driver: {
          include: {
            assignments: {
              where: { isActive: true },
              include: {
                bus: {
                  include: {
                    districts: { include: { district: true } },
                    locations: {
                      orderBy: { timestamp: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
            routes: {
              where: { isActive: true },
              include: {
                university: true,
                district: true,
                bus: true,
              },
            },
          },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const driver = fullUser.driver;

    if (!driver) {
      return NextResponse.json({
        linked: false,
        message: "حسابك غير مربوط بسائق. تواصل مع المدير لربط حسابك.",
        user: {
          id: fullUser.id,
          fullName: fullUser.fullName,
          username: fullUser.username,
          role: fullUser.role,
        },
      });
    }

    const activeAssignment = driver.assignments[0];
    const assignedBus = activeAssignment
      ? {
          id: activeAssignment.bus.id,
          busNumber: activeAssignment.bus.busNumber,
          capacity: activeAssignment.bus.capacity,
          district: activeAssignment.bus.districts[0]?.district?.name || "غير محدد",
          assignedAt: activeAssignment.assignedAt,
          isOnline:
            activeAssignment.bus.locations.length > 0 &&
            new Date().getTime() -
              new Date(activeAssignment.bus.locations[0].timestamp).getTime() <
              5 * 60 * 1000,
          lastLocation: activeAssignment.bus.locations[0] || null,
        }
      : null;

    // إحصائيات الرحلات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todayTrips = 0;
    let totalTrips = 0;

    if (activeAssignment) {
      todayTrips = await prisma.trip.count({
        where: {
          busId: activeAssignment.busId,
          tripDate: { gte: today, lt: tomorrow },
        },
      });

      totalTrips = await prisma.trip.count({
        where: { busId: activeAssignment.busId },
      });
    }

    return NextResponse.json({
      linked: true,
      user: {
        id: fullUser.id,
        fullName: fullUser.fullName,
        username: fullUser.username,
        role: fullUser.role,
      },
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
      },
      assignedBus,
      routes: driver.routes.map((r) => ({
        id: r.id,
        university: r.university.name,
        district: r.district?.name || "غير محدد",
        busNumber: r.bus.busNumber,
      })),
      stats: {
        todayTrips,
        totalTrips,
        routesCount: driver.routes.length,
      },
    });
  } catch (error) {
    console.error("Driver dashboard error:", error);
    return NextResponse.json(
      { error: "فشل جلب بيانات السائق" },
      { status: 500 }
    );
  }
}
