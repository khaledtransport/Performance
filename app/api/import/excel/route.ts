import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";

// POST: استيراد ملف Excel وتحويله إلى رحلات
export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // قراءة ملف Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json({ error: "الملف فارغ" }, { status: 400 });
    }

    // أوقات رحلات الذهاب والعودة
    const goTimes = [
      "7:30 AM",
      "8:30 AM",
      "9:30 AM",
      "10:30 AM",
      "11:30 AM",
      "12:30 PM",
      "1:30 PM",
      "2:30 PM",
      "المجمّع",
    ];
    const returnTimes = [
      "12:30 PM",
      "1:30 PM",
      "2:30 PM",
      "3:30 PM",
      "4:30 PM",
      "5:30 PM",
      "المجمّع",
    ];

    const results = {
      routesCreated: 0,
      tripsCreated: 0,
      errors: [] as string[],
    };

    // معالجة كل سطر من الملف — مع كاش محلي لتجنب N+1 queries
    const uniCache = new Map<string, { id: string }>();
    const driverCache = new Map<string, { id: string }>();
    const busCache = new Map<string, { id: string }>();
    const repCache = new Map<string, { id: string }>();

    for (const row of data) {
      try {
        // جلب أو إنشاء الجامعة (مع كاش)
        const uniName = row["الجامعة"] || row["اسم الجامعة"];
        let university = uniCache.get(uniName);
        if (!university) {
          university = await prisma.university.findFirst({ where: { name: uniName } })
            ?? await prisma.university.create({ data: { name: uniName } });
          uniCache.set(uniName, university);
        }

        // جلب أو إنشاء السائق (مع كاش)
        const drvName = row["السائق"] || row["اسم السائق"];
        let driver = driverCache.get(drvName);
        if (!driver) {
          driver = await prisma.driver.findFirst({ where: { name: drvName } })
            ?? await prisma.driver.create({ data: { name: drvName } });
          driverCache.set(drvName, driver);
        }

        // جلب أو إنشاء الباص (مع كاش)
        const busNum = String(row["الباص"] || row["رقم الباص"]);
        let bus = busCache.get(busNum);
        if (!bus) {
          bus = await prisma.bus.findFirst({ where: { busNumber: busNum } })
            ?? await prisma.bus.create({ data: { busNumber: busNum, capacity: 50 } });
          busCache.set(busNum, bus);
        }

        // جلب أو إنشاء المندوب (مع كاش)
        const repName = row["المندوب"] || row["اسم المندوب"];
        let representative = repCache.get(repName);
        if (!representative) {
          representative = await prisma.representative.findFirst({ where: { name: repName } })
            ?? await prisma.representative.create({ data: { name: repName } });
          repCache.set(repName, representative);
        }

        // إنشاء الرحلة الأساسية
        const route = await prisma.route.create({
          data: {
            universityId: university.id,
            driverId: driver.id,
            busId: bus.id,
            representativeId: representative.id,
            totalGoTrips: parseInt(row["عدد رحلات الذهاب"]) || 0,
            totalReturnTrips: parseInt(row["عدد رحلات العودة"]) || 0,
          },
        });
        results.routesCreated++;

        // تاريخ اليوم
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // إنشاء رحلات الذهاب من أعمدة الأوقات
        for (const time of goTimes) {
          const cellValue = row[`ذهاب_${time}`] || row[time];
          if (cellValue) {
            try {
              await prisma.routeTrip.create({
                data: {
                  routeId: route.id,
                  tripDate: today,
                  direction: "GO",
                  tripTime: time,
                  studentsCount: parseInt(cellValue) || 0,
                  status: "PENDING",
                },
              });
              results.tripsCreated++;
            } catch (e: any) {
              // تجاهل التكرار لكن تسجيله للمراجعة بدون إيقاف العملية
              console.error(
                "تكرار رحلة ذهاب أو خطأ في إنشائها:",
                e?.message || e
              );
            }
          }
        }

        // إنشاء رحلات العودة
        for (const time of returnTimes) {
          const cellValue = row[`عودة_${time}`] || row[time];
          if (cellValue) {
            try {
              await prisma.routeTrip.create({
                data: {
                  routeId: route.id,
                  tripDate: today,
                  direction: "RETURN",
                  tripTime: time,
                  studentsCount: parseInt(cellValue) || 0,
                  status: "PENDING",
                },
              });
              results.tripsCreated++;
            } catch (e: any) {
              console.error(
                "تكرار رحلة عودة أو خطأ في إنشائها:",
                e?.message || e
              );
            }
          }
        }
      } catch (error: any) {
        results.errors.push(`خطأ في السطر: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم استيراد البيانات بنجاح",
      results,
    });
  } catch (error: any) {
    console.error("Error importing Excel:", error);
    return NextResponse.json(
      {
        error: "خطأ في استيراد الملف",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
