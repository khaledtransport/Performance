import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: جلب الإشعارات
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get("x-user-id");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    const where: Record<string, unknown> = {};
    if (userId) {
      where.OR = [{ userId }, { userId: null }]; // إشعارات خاصة + عامة
    }
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: { user: { select: { fullName: true } } },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "فشل جلب الإشعارات" },
      { status: 500 }
    );
  }
}

// POST: إنشاء إشعار جديد
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, type, userId, link } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "العنوان والرسالة مطلوبان" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || "INFO",
        userId: userId || null,
        link: link || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "فشل إنشاء الإشعار" },
      { status: 500 }
    );
  }
}

// PUT: تحديث حالة القراءة (قراءة الكل)
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    const where: Record<string, unknown> = { isRead: false };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "تم تحديث جميع الإشعارات" });
  } catch (error) {
    console.error("Notifications PUT error:", error);
    return NextResponse.json(
      { error: "فشل تحديث الإشعارات" },
      { status: 500 }
    );
  }
}
