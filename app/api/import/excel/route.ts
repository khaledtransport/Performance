import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// POST: استيراد ملف Excel وتحويله إلى رحلات
export async function POST(request: NextRequest) {
  try {
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

    // معالجة كل سطر من الملف
    for (const row of data) {
      try {
        // جلب أو إنشاء الجامعة
        let university = await prisma.university.findFirst({
          where: { name: row["الجامعة"] || row["اسم الجامعة"] },
        });
        if (!university) {
          university = await prisma.university.create({
            data: { name: row["الجامعة"] || row["اسم الجامعة"] },
          });
        }

        // جلب أو إنشاء السائق
        let driver = await prisma.driver.findFirst({
          where: { name: row["السائق"] || row["اسم السائق"] },
        });
        if (!driver) {
          driver = await prisma.driver.create({
            data: { name: row["السائق"] || row["اسم السائق"] },
          });
        }

        // جلب أو إنشاء الباص
        let bus = await prisma.bus.findFirst({
          where: { busNumber: String(row["الباص"] || row["رقم الباص"]) },
        });
        if (!bus) {
          bus = await prisma.bus.create({
            data: {
              busNumber: String(row["الباص"] || row["رقم الباص"]),
              capacity: 50,
            },
          });
        }

        // جلب أو إنشاء المندوب
        let representative = await prisma.representative.findFirst({
          where: { name: row["المندوب"] || row["اسم المندوب"] },
        });
        if (!representative) {
          representative = await prisma.representative.create({
            data: { name: row["المندوب"] || row["اسم المندوب"] },
          });
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
