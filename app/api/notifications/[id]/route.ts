import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT: تحديث إشعار (قراءة)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return NextResponse.json(notification);
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
