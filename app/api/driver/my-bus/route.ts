import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: الحصول على الباص المخصص للسائق الحالي عبر ربط User → Driver → Assignment
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // جلب المستخدم مع السائق المربوط
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!fullUser?.driver) {
      // المستخدم غير مربوط بسائق - أرجع قائمة الباصات للاختيار اليدوي
      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        include: {
          districts: { include: { district: true } },
        },
        orderBy: { busNumber: "asc" },
      });

      return NextResponse.json({
        driver: null,
        assignedBus: null,
        availableBuses: buses.map((bus) => ({
          id: bus.id,
          busNumber: bus.busNumber,
          district: bus.districts[0]?.district?.name || "غير محدد",
        })),
      });
    }

    const driver = fullUser.driver;
    const activeAssignment = driver.assignments[0];

    if (!activeAssignment) {
      // fallback: حاول جلب الباص من المسار النشط للسائق
      const activeRoute = await prisma.route.findFirst({
        where: { driverId: driver.id, isActive: true },
        orderBy: { updatedAt: "desc" },
        include: {
          bus: {
            include: {
              districts: { include: { district: true } },
            },
          },
        },
      });

      if (activeRoute?.bus) {
        return NextResponse.json({
          driver: { id: driver.id, name: driver.name },
          assignedBus: {
            id: activeRoute.bus.id,
            busNumber: activeRoute.bus.busNumber,
            district: activeRoute.bus.districts[0]?.district?.name || "غير محدد",
          },
          availableBuses: [],
        });
      }

      // السائق مربوط لكن بدون باص مخصص حالياً
      const buses = await prisma.bus.findMany({
        where: { isActive: true },
        orderBy: { busNumber: "asc" },
        include: {
          districts: { include: { district: true } },
        },
      });

      return NextResponse.json({
        driver: { id: driver.id, name: driver.name },
        assignedBus: null,
        availableBuses: buses.map((bus) => ({
          id: bus.id,
          busNumber: bus.busNumber,
          district: bus.districts[0]?.district?.name || "غير محدد",
        })),
      });
    }

    return NextResponse.json({
      driver: { id: driver.id, name: driver.name },
      assignedBus: {
        id: activeAssignment.bus.id,
        busNumber: activeAssignment.bus.busNumber,
        district:
          activeAssignment.bus.districts[0]?.district?.name || "غير محدد",
      },
      availableBuses: [],
    });
  } catch (error) {
    console.error("Driver my-bus error:", error);
    return NextResponse.json(
      { error: "فشل جلب بيانات الباص" },
      { status: 500 }
    );
  }
}
