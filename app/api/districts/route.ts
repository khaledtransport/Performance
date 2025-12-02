import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 دقائق

export async function GET() {
  try {
    // محاولة جلب من الكاش أولاً
    const cacheKey = "districts:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const districts = await prisma.district.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // حفظ في الكاش
    apiCache.set(cacheKey, districts, CACHE_TTL);

    return NextResponse.json(districts);
  } catch (error) {
    console.error("خطأ في جلب الأحياء:", error);
    return NextResponse.json(
      {
        error: "فشل جلب الأحياء",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "اسم الحي مطلوب" }, { status: 400 });
    }

    const newDistrict = await prisma.district.create({
      data: {
        name,
        description: description || null,
      },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("districts:all");

    return NextResponse.json(newDistrict, { status: 201 });
  } catch (error: any) {
    console.error("خطأ في إضافة الحي:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الحي موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "فشل إضافة الحي", details: error.message },
      { status: 500 }
    );
  }
}
