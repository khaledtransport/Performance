import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { ADMIN_ROLES } from "@/lib/rbac";
import { readSheet } from "read-excel-file/node";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type ImportRow = Record<string, string | number | boolean | Date | null>;

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function rowsToObjects(rows: unknown[][]): ImportRow[] {
  const [headersRow, ...bodyRows] = rows;
  if (!headersRow) return [];

  const headers = headersRow.map((header) => String(header ?? "").trim());

  return bodyRows
    .map((row) => {
      const record: ImportRow = {};
      headers.forEach((header, index) => {
        if (header) record[header] = (row[index] ?? null) as ImportRow[string];
      });
      return record;
    })
    .filter((row) => Object.values(row).some((value) => value !== null && String(value).trim() !== ""));
}

function cellText(value: ImportRow[string]): string {
  return String(value ?? "").trim();
}

// POST: استيراد ملف Excel وتحويله إلى رحلات
export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const auth = await requireApiRole(ADMIN_ROLES);
    if (auth.response) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد المسموح 5MB" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "الصيغ المدعومة حالياً: .xlsx و .csv" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const rows = fileName.endsWith(".csv")
      ? parseCsvRows(buffer.toString("utf8"))
      : await readSheet(buffer);
    const data = rowsToObjects(rows);

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
        const uniName = cellText(row["الجامعة"] || row["اسم الجامعة"]);
        if (!uniName) throw new Error("اسم الجامعة مطلوب");
        let university = uniCache.get(uniName);
        if (!university) {
          university = await prisma.university.findFirst({ where: { name: uniName } })
            ?? await prisma.university.create({ data: { name: uniName } });
          uniCache.set(uniName, university);
        }

        // جلب أو إنشاء السائق (مع كاش)
        const drvName = cellText(row["السائق"] || row["اسم السائق"]);
        if (!drvName) throw new Error("اسم السائق مطلوب");
        let driver = driverCache.get(drvName);
        if (!driver) {
          driver = await prisma.driver.findFirst({ where: { name: drvName } })
            ?? await prisma.driver.create({ data: { name: drvName } });
          driverCache.set(drvName, driver);
        }

        // جلب أو إنشاء الباص (مع كاش)
        const busNum = cellText(row["الباص"] || row["رقم الباص"]);
        if (!busNum) throw new Error("رقم الباص مطلوب");
        let bus = busCache.get(busNum);
        if (!bus) {
          bus = await prisma.bus.findFirst({ where: { busNumber: busNum } })
            ?? await prisma.bus.create({ data: { busNumber: busNum, capacity: 50 } });
          busCache.set(busNum, bus);
        }

        // جلب أو إنشاء المندوب (مع كاش)
        const repName = cellText(row["المندوب"] || row["اسم المندوب"]);
        let representative = repName ? repCache.get(repName) : null;
        if (repName && !representative) {
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
            representativeId: representative?.id,
            totalGoTrips: parseInt(cellText(row["عدد رحلات الذهاب"]), 10) || 0,
            totalReturnTrips: parseInt(cellText(row["عدد رحلات العودة"]), 10) || 0,
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
                  studentsCount: parseInt(cellText(cellValue), 10) || 0,
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
                  studentsCount: parseInt(cellText(cellValue), 10) || 0,
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
