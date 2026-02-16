import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: جلب المستخدمين من نوع سائق
export async function GET() {
  try {
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
