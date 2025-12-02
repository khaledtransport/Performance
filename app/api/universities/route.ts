import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 دقائق

// GET: جلب جميع الجامعات
export async function GET() {
  try {
    // محاولة جلب من الكاش أولاً
    const cacheKey = "universities:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // حساب عدد الرحلات بفعالية
    const routeCounts = await prisma.route.groupBy({
      by: ["universityId"],
      _count: true,
    });

    const countMap = new Map(
      routeCounts.map((rc) => [rc.universityId, rc._count])
    );

    const enriched = universities.map((u) => ({
      ...u,
      routesCount: countMap.get(u.id) || 0,
    }));

    // حفظ في الكاش
    apiCache.set(cacheKey, enriched, CACHE_TTL);

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("universities GET error:", error);
    return NextResponse.json(
      {
        error: "خطأ في جلب البيانات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

// POST: إضافة جامعة جديدة
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم الجامعة مطلوب" }, { status: 400 });
    }

    const newUniversity = await prisma.university.create({
      data: {
        name,
      },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("universities:all");

    return NextResponse.json(newUniversity, { status: 201 });
  } catch (error: any) {
    console.error("Error adding university:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الجامعة موجود مسبقاً" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "خطأ في إضافة الجامعة", details: error?.message },
      { status: 500 }
    );
  }
}
