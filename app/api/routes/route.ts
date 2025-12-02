import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRouteSchema, validateRequest } from "@/lib/validations/route";
import { apiCache } from "@/lib/cache";

const CACHE_TTL = 300000; // 5 دقائق

// GET: جلب جميع الرحلات الأساسية مع البيانات المرتبطة
export async function GET() {
  try {
    // محاولة جلب من الكاش أولاً
    const cacheKey = "routes:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const routes = await prisma.route.findMany({
      select: {
        id: true,
        universityId: true,
        driverId: true,
        busId: true,
        districtId: true,
        createdAt: true,
        updatedAt: true,
        university: {
          select: { id: true, name: true },
        },
        driver: {
          select: { id: true, name: true },
        },
        bus: {
          select: {
            id: true,
            busNumber: true,
            capacity: true,
            districts: {
              select: {
                id: true,
                districtId: true,
                district: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        district: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // حفظ في الكاش
    apiCache.set(cacheKey, routes, CACHE_TTL);

    return NextResponse.json(routes);
  } catch (error) {
    console.error("routes GET error:", error);
    return NextResponse.json(
      {
        error: "خطأ في جلب البيانات",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

// POST: إضافة رحلة أساسية جديدة
export async function POST(request: NextRequest) {
  try {
    const validator = validateRequest(createRouteSchema);
    const { data: body, error: validationError } = await validator(request);

    if (validationError) {
      console.error("Validation error in POST /api/routes:", validationError);
      return validationError;
    }
    if (!body)
      return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });

    const { universityId, driverId, busId, districtId } = body;

    const newRoute = await prisma.route.create({
      data: {
        universityId,
        driverId,
        busId,
        ...(districtId ? { districtId } : {}),
      },
      include: {
        university: true,
        driver: true,
        bus: {
          include: {
            districts: {
              include: {
                district: true,
              },
            },
          },
        },
        district: true,
      },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("routes:all");

    return NextResponse.json(newRoute, { status: 201 });
  } catch (error: any) {
    console.error("routes POST error:", error);
    return NextResponse.json(
      { error: "خطأ في إضافة الرحلة", details: error.message },
      { status: 500 }
    );
  }
}
