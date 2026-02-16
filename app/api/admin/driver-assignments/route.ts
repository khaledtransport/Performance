import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: جلب جميع السائقين مع ربطهم بالحسابات والباصات
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const drivers = await prisma.driver.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
        assignments: {
          where: { isActive: true },
          include: {
            bus: {
              select: {
                id: true,
                busNumber: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // جلب حسابات بدور DRIVER غير مربوطة
    const unlinkedDriverUsers = await prisma.user.findMany({
      where: {
        role: "DRIVER",
        driverId: null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
    });

    // جلب الباصات النشطة
    const buses = await prisma.bus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        busNumber: true,
      },
      orderBy: { busNumber: "asc" },
    });

    return NextResponse.json({
      drivers: drivers.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        licenseNumber: d.licenseNumber,
        linkedUser: d.user
          ? {
              id: d.user.id,
              username: d.user.username,
              fullName: d.user.fullName,
            }
          : null,
        assignedBus: d.assignments[0]
          ? {
              assignmentId: d.assignments[0].id,
              busId: d.assignments[0].bus.id,
              busNumber: d.assignments[0].bus.busNumber,
              assignedAt: d.assignments[0].assignedAt,
            }
          : null,
      })),
      unlinkedUsers: unlinkedDriverUsers,
      buses,
    });
  } catch (error) {
    console.error("Driver assignments GET error:", error);
    return NextResponse.json(
      { error: "فشل جلب البيانات" },
      { status: 500 }
    );
  }
}

// POST: ربط سائق بحساب مستخدم أو تخصيص باص
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const { action, driverId, userId, busId } = body;

    switch (action) {
      case "link_user": {
        // ربط حساب مستخدم بسائق
        if (!driverId || !userId) {
          return NextResponse.json(
            { error: "معرّف السائق والمستخدم مطلوبان" },
            { status: 400 }
          );
        }

        // التحقق من أن المستخدم ليس مربوط مسبقاً
        const existingLink = await prisma.user.findFirst({
          where: { driverId, id: { not: userId } },
        });
        if (existingLink) {
          return NextResponse.json(
            { error: "هذا السائق مربوط بحساب آخر" },
            { status: 400 }
          );
        }

        await prisma.user.update({
          where: { id: userId },
          data: { driverId, role: "DRIVER" },
        });

        return NextResponse.json({ success: true, message: "تم ربط الحساب بالسائق" });
      }

      case "unlink_user": {
        // فك ربط حساب من سائق
        if (!driverId) {
          return NextResponse.json(
            { error: "معرّف السائق مطلوب" },
            { status: 400 }
          );
        }

        await prisma.user.updateMany({
          where: { driverId },
          data: { driverId: null },
        });

        return NextResponse.json({ success: true, message: "تم فك ربط الحساب" });
      }

      case "assign_bus": {
        // تخصيص باص لسائق
        if (!driverId || !busId) {
          return NextResponse.json(
            { error: "معرّف السائق والباص مطلوبان" },
            { status: 400 }
          );
        }

        // إلغاء التخصيص السابق
        await prisma.busDriverAssignment.updateMany({
          where: { driverId, isActive: true },
          data: { isActive: false, unassignedAt: new Date() },
        });

        // إنشاء تخصيص جديد
        const assignment = await prisma.busDriverAssignment.create({
          data: { busId, driverId },
          include: { bus: true },
        });

        return NextResponse.json({
          success: true,
          message: `تم تخصيص باص ${assignment.bus.busNumber} للسائق`,
        });
      }

      case "unassign_bus": {
        // إلغاء تخصيص الباص
        if (!driverId) {
          return NextResponse.json(
            { error: "معرّف السائق مطلوب" },
            { status: 400 }
          );
        }

        await prisma.busDriverAssignment.updateMany({
          where: { driverId, isActive: true },
          data: { isActive: false, unassignedAt: new Date() },
        });

        return NextResponse.json({ success: true, message: "تم إلغاء تخصيص الباص" });
      }

      default:
        return NextResponse.json(
          { error: "إجراء غير صالح" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Driver assignments POST error:", error);
    return NextResponse.json(
      { error: "فشل تنفيذ العملية" },
      { status: 500 }
    );
  }
}
