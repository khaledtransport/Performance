import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PUT: تحديث إشعار (قراءة)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const result = await prisma.notification.updateMany({
      where: {
        id,
        OR: [{ userId: currentUser.userId }, { userId: null }],
      },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification PUT error:", error);
    return NextResponse.json(
      { error: "فشل تحديث الإشعار" },
      { status: 500 }
    );
  }
}

// DELETE: حذف إشعار
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (!["ADMIN", "MANAGER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json(
      { error: "فشل حذف الإشعار" },
      { status: 500 }
    );
  }
}
