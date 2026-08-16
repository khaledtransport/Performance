import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiCache } from "@/lib/cache";
import { requireApiRole } from "@/lib/api-auth";
import { ADMIN_ROLES, VIEW_ROLES } from "@/lib/rbac";

// GET: جلب جميع المناديب
export async function GET() {
  try {
    const auth = await requireApiRole(VIEW_ROLES);
    if (auth.response) return auth.response;

    const cacheKey = "representatives:all";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    const representatives = await prisma.representative.findMany({
      orderBy: { name: "asc" },
    });

    apiCache.set(cacheKey, representatives, 300_000);
    return NextResponse.json(representatives, { headers: { "X-Cache": "MISS" } });
  } catch (error: any) {
    console.error("GET /api/representatives error:", error);
    return NextResponse.json(
      { error: "خطأ في جلب البيانات", details: error.message },
      { status: 500 }
    );
  }
}

// POST: إضافة مندوب جديد
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRole(ADMIN_ROLES);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { name, phone, email } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المندوب مطلوب" }, { status: 400 });
    }

    const newRepresentative = await prisma.representative.create({
      data: { name, phone, email },
    });

    // بطّل الكاش بعد إضافة data جديدة
    apiCache.delete("representatives:all");

    return NextResponse.json(newRepresentative, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/representatives error:", error);
    return NextResponse.json(
      { error: "خطأ في إضافة المندوب", details: error.message },
      { status: 500 }
    );
  }
}
