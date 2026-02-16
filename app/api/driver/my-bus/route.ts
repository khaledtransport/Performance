import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getActiveBuses() {
  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    include: {
      districts: { include: { district: true } },
    },
    orderBy: { busNumber: "asc" },
  });

  return buses.map((bus) => ({
    id: bus.id,
    busNumber: bus.busNumber,
    district: bus.districts[0]?.district?.name || "غير محدد",
  }));
}

// GET: الحصول على الباص المخصص للسائق الحالي عبر ربط User → Driver → Assignment
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // جلب المستخدم مع السائق المربوط (إن وجد)
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        driver: {
          include: {
            assignments: {
              where: { isActive: true },
              orderBy: { assignedAt: "desc" },
              take: 1,
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

    if (!fullUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    let driver = fullUser.driver;

    if (!driver && fullUser.role === "DRIVER") {
      const normalizedName = fullUser.fullName.trim();

      if (normalizedName) {
        const matchedDrivers = await prisma.driver.findMany({
          where: {
            name: {
              equals: normalizedName,
              mode: "insensitive",
            },
          },
          include: {
            assignments: {
              where: { isActive: true },
              orderBy: { assignedAt: "desc" },
              take: 1,
              include: {
                bus: {
                  include: {
                    districts: { include: { district: true } },
                  },
                },
              },
            },
          },
        });

        if (matchedDrivers.length === 1) {
          driver = matchedDrivers[0];
        }
      }
    }

    if (!driver) {
      return NextResponse.json({
        driver: null,
        assignedBus: null,
        availableBuses: await getActiveBuses(),
      });
    }

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

      return NextResponse.json({
        driver: { id: driver.id, name: driver.name },
        assignedBus: null,
        availableBuses: await getActiveBuses(),
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
