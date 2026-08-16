import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-auth";
import { ADMIN_ROLES } from "@/lib/rbac";

// GET: جلب المستخدمين من نوع سائق
export async function GET() {
  try {
    const auth = await requireApiRole(ADMIN_ROLES);
    if (auth.response) return auth.response;

    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER", isActive: true },
      select: {
        id: true,
        fullName: true,
        username: true,
        driver: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ drivers });
  } catch (error) {
    console.error("Drivers-users GET error:", error);
    return NextResponse.json(
      { error: "فشل جلب السائقين" },
      { status: 500 }
    );
  }
}
