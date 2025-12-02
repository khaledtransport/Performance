import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 دقائق

// GET: جلب جميع السائقين
export async function GET() {
  try {
    // محاولة جلب من الكاش أولاً
    const cacheKey = "drivers:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const drivers = await prisma.driver.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // حفظ في الكاش
    apiCache.set(cacheKey, drivers, CACHE_TTL);

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("drivers GET error:", error);
    return NextResponse.json(
      {
        error: "خطأ في جلب البيانات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

// POST: إضافة سائق جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم السائق مطلوب" }, { status: 400 });
    }

    const newDriver = await prisma.driver.create({
      data: {
        name,
        phone,
      },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("drivers:all");

    return NextResponse.json(newDriver, { status: 201 });
  } catch (error: any) {
    console.error("Error adding driver:", error);
    return NextResponse.json(
      { error: "خطأ في إضافة السائق", details: error.message },
      { status: 500 }
    );
  }
}
