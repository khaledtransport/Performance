const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 بدء إضافة البيانات التجريبية...");

  // حذف البيانات الموجودة
  await prisma.routeTrip.deleteMany();
  await prisma.route.deleteMany();
  await prisma.university.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.representative.deleteMany();
  await prisma.district.deleteMany();

  // إضافة الجامعات
  const universities = await Promise.all([
    prisma.university.create({ data: { name: "جامعة الملك سعود" } }),
    prisma.university.create({ data: { name: "جامعة الأميرة نورة" } }),
    prisma.university.create({ data: { name: "جامعة الإمام محمد بن سعود" } }),
    prisma.university.create({ data: { name: "جامعة الفيصل" } }),
  ]);
  console.log("✅ تم إضافة الجامعات");

  // إضافة الأحياء
  const districts = await Promise.all([
    prisma.district.create({
      data: { name: "حي الرياض", description: "حي الرياض الشرقي" },
    }),
    prisma.district.create({
      data: { name: "حي العليا", description: "حي العليا الفاخر" },
    }),
    prisma.district.create({
      data: { name: "حي السلي", description: "حي السلي السكني" },
    }),
    prisma.district.create({
      data: { name: "حي القصيم", description: "حي القصيم الجديد" },
    }),
  ]);
  console.log("✅ تم إضافة الأحياء");

  // إضافة السائقين
  const drivers = await Promise.all([
    prisma.driver.create({ data: { name: "أحمد محمد", phone: "0501234567" } }),
    prisma.driver.create({
      data: { name: "خالد عبدالله", phone: "0501234568" },
    }),
    prisma.driver.create({ data: { name: "محمد علي", phone: "0501234569" } }),
    prisma.driver.create({
      data: { name: "عبدالرحمن سعد", phone: "0501234570" },
    }),
    prisma.driver.create({ data: { name: "سعيد حسن", phone: "0501234571" } }),
  ]);
  console.log("✅ تم إضافة السائقين");

  // إضافة الباصات
  const buses = await Promise.all([
    prisma.bus.create({
      data: {
        busNumber: "BUS-001",
        capacity: 50,
        districts: {
          create: {
            districtId: districts[0].id
          }
        },
      },
    }),
    prisma.bus.create({
      data: {
        busNumber: "BUS-002",
        capacity: 45,
        districts: {
          create: {
            districtId: districts[1].id
          }
        },
      },
    }),
    prisma.bus.create({
      data: {
        busNumber: "BUS-003",
        capacity: 50,
        districts: {
          create: {
            districtId: districts[2].id
          }
        },
      },
    }),
    prisma.bus.create({
      data: {
        busNumber: "BUS-004",
        capacity: 40,
        districts: {
          create: {
            districtId: districts[3].id
          }
        },
      },
    }),
    prisma.bus.create({
      data: {
        busNumber: "BUS-005",
        capacity: 50,
        districts: {
          create: {
            districtId: districts[0].id
          }
        },
      },
    }),
  ]);
  console.log("✅ تم إضافة الباصات");

  // إضافة المناديب
  const representatives = await Promise.all([
    prisma.representative.create({
      data: {
        name: "فيصل العتيبي",
        phone: "0509876543",
        email: "faisal@example.com",
      },
    }),
    prisma.representative.create({
      data: {
        name: "نواف الشمري",
        phone: "0509876544",
        email: "nawaf@example.com",
      },
    }),
    prisma.representative.create({
      data: {
        name: "عبدالله القحطاني",
        phone: "0509876545",
        email: "abdullah@example.com",
      },
    }),
  ]);
  console.log("✅ تم إضافة المناديب");

  // إضافة الرحلات الأساسية (Routes)
  const routes = [];
  for (let i = 0; i < 4; i++) {
    const route = await prisma.route.create({
      data: {
        universityId: universities[i].id,
        driverId: drivers[i].id,
        busId: buses[i].id,
        representativeId: representatives[i % 3].id,
        totalGoTrips: 9,
        totalReturnTrips: 7,
      },
    });
    routes.push(route);
  }
  console.log("✅ تم إضافة الرحلات الأساسية");

  // إضافة رحلات يومية تجريبية
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // وقت الذهاب: من 7:00 صباحًا إلى 12:00 ظهرًا
  const goTimes = [
    "7:00 AM",
    "7:30 AM",
    "8:00 AM",
    "8:30 AM",
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
  ];

  // وقت العودة: من 12:00 ظهرًا إلى 6:00 مساءً
  const returnTimes = [
    "12:00 PM",
    "12:30 PM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
    "5:00 PM",
    "5:30 PM",
    "6:00 PM",
  ];

  for (const route of routes) {
    // رحلات الذهاب
    for (const time of goTimes) {
      await prisma.routeTrip.create({
        data: {
          routeId: route.id,
          tripDate: today,
          direction: "GO",
          tripTime: time,
          studentsCount: Math.floor(Math.random() * 30) + 10,
          status: ["PENDING", "DEPARTED", "ARRIVED"][
            Math.floor(Math.random() * 3)
          ],
        },
      });
    }

    // رحلات العودة
    for (const time of returnTimes) {
      await prisma.routeTrip.create({
        data: {
          routeId: route.id,
          tripDate: today,
          direction: "RETURN",
          tripTime: time,
          studentsCount: Math.floor(Math.random() * 30) + 10,
          status: "PENDING",
        },
      });
    }
  }
  console.log("✅ تم إضافة الرحلات اليومية");

  console.log("🎉 تم إضافة جميع البيانات التجريبية بنجاح!");
}

main()
  .catch((e) => {
    console.error("❌ خطأ:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
