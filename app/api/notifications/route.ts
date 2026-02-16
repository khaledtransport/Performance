import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/web-push";

// GET: جلب الإشعارات
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = currentUser.userId;
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

// POST: إنشاء إشعار جديد (يدعم الإرسال الجماعي للسائقين)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (!["ADMIN", "MANAGER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, type, userId, link, priority, soundType, target } = body;
    const senderId = currentUser.userId;

    if (!title || !message) {
      return NextResponse.json(
        { error: "العنوان والرسالة مطلوبان" },
        { status: 400 }
      );
    }

    // إرسال جماعي لكل السائقين
    if (target === "ALL_DRIVERS") {
      const drivers = await prisma.user.findMany({
        where: { role: "DRIVER", isActive: true },
        select: { id: true },
      });

      const notifications = await prisma.notification.createMany({
        data: drivers.map((driver) => ({
          title,
          message,
          type: type || "INFO",
          priority: priority || "NORMAL",
          soundType: soundType || null,
          userId: driver.id,
          senderId: senderId || null,
          link: link || null,
        })),
      });

      try {
        await sendPushToUsers(
          drivers.map((driver) => driver.id),
          {
            title,
            message,
            link: link || null,
            tag: type || "INFO",
          }
        );
      } catch (pushError) {
        console.error("Push delivery failed (ALL_DRIVERS):", pushError);
      }

      return NextResponse.json(
        { success: true, count: notifications.count, message: `تم إرسال الإشعار إلى ${notifications.count} سائق` },
        { status: 201 }
      );
    }

    // إرسال لسائقين محددين
    if (target === "SELECTED_DRIVERS" && Array.isArray(body.driverIds) && body.driverIds.length > 0) {
      const notifications = await prisma.notification.createMany({
        data: body.driverIds.map((dId: string) => ({
          title,
          message,
          type: type || "INFO",
          priority: priority || "NORMAL",
          soundType: soundType || null,
          userId: dId,
          senderId: senderId || null,
          link: link || null,
        })),
      });

      try {
        await sendPushToUsers(body.driverIds, {
          title,
          message,
          link: link || null,
          tag: type || "INFO",
        });
      } catch (pushError) {
        console.error("Push delivery failed (SELECTED_DRIVERS):", pushError);
      }

      return NextResponse.json(
        { success: true, count: notifications.count, message: `تم إرسال الإشعار إلى ${notifications.count} سائق` },
        { status: 201 }
      );
    }

    // إشعار فردي أو عام
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || "INFO",
        priority: priority || "NORMAL",
        soundType: soundType || null,
        userId: userId || null,
        senderId: senderId || null,
        link: link || null,
      },
    });

    if (userId) {
      try {
        await sendPushToUsers([userId], {
          title,
          message,
          link: link || null,
          tag: type || "INFO",
        });
      } catch (pushError) {
        console.error("Push delivery failed (single):", pushError);
      }
    } else {
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      try {
        await sendPushToUsers(
          activeUsers.map((user) => user.id),
          {
            title,
            message,
            link: link || null,
            tag: type || "INFO",
          }
        );
      } catch (pushError) {
        console.error("Push delivery failed (broadcast):", pushError);
      }
    }

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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const userId = currentUser.userId;

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
