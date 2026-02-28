import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // التسجيل متاح فقط للمشرفين — لا يمكن لأحد التسجيل بنفسه
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "فقط المدير يمكنه إنشاء حسابات جديدة" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, fullName, email, role } = body;

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: "اسم المستخدم وكلمة المرور والاسم الكامل مطلوبون" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase().trim() },
          ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً" },
        { status: 409 }
      );
    }

    // تشفير كلمة المرور
    const passwordHash = await hashPassword(password);

    // الدور الافتراضي: VIEWER — لا يُسمح بتمرير الدور من الطلب
    // فقط ADMIN يمكنه تعيين أدوار أخرى (يتم التحقق عبر middleware)
    const allowedRoles = ["ADMIN", "MANAGER", "DELEGATE", "DRIVER", "VIEWER"];
    const safeRole = (role && allowedRoles.includes(role)) ? role : "VIEWER";

    // إنشاء المستخدم
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        email: email ? email.toLowerCase().trim() : null,
        role: safeRole,
      },
    });

    // لا نغيّر جلسة الأدمن — فقط نرجع بيانات المستخدم الجديد
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحساب" },
      { status: 500 }
    );
  }
}
