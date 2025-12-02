const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addTodayTrips() {
  try {
    // الحصول على أول route
    const route = await prisma.route.findFirst();
    if (!route) {
      console.log("لا يوجد routes");
      return;
    }

    console.log("Route found:", route.id);

    // تاريخ اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // التحقق إذا كان هناك رحلات اليوم
    const existingTrips = await prisma.routeTrip.count({
      where: {
        tripDate: today,
      },
    });

    if (existingTrips > 0) {
      console.log("يوجد بالفعل", existingTrips, "رحلات اليوم");
    } else {
      // إضافة 3 رحلات لليوم
      const trips = await prisma.routeTrip.createMany({
        data: [
          {
            routeId: route.id,
            tripDate: today,
            direction: "GO",
            tripTime: "08:30",
            studentsCount: 25,
            status: "PENDING",
          },
          {
            routeId: route.id,
            tripDate: today,
            direction: "GO",
            tripTime: "10:30",
            studentsCount: 30,
            status: "DEPARTED",
          },
          {
            routeId: route.id,
            tripDate: today,
            direction: "RETURN",
            tripTime: "14:30",
            studentsCount: 28,
            status: "PENDING",
          },
        ],
      });

      console.log(
        "تم إضافة",
        trips.count,
        "رحلات لليوم:",
        today.toISOString().split("T")[0]
      );
    }

    // التحقق
    const dates = await prisma.routeTrip.groupBy({
      by: ["tripDate"],
      _count: true,
      orderBy: { tripDate: "desc" },
    });

    console.log("\n=== التواريخ التي تحتوي على رحلات ===");
    dates.forEach((d) => {
      console.log(
        d.tripDate.toISOString().split("T")[0],
        ":",
        d._count,
        "رحلة"
      );
    });
  } catch (e) {
    console.error("Error:", e.message);
  }
  await prisma.$disconnect();
}

addTodayTrips();
