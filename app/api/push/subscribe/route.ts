import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canUseWebPushServer } from "@/lib/web-push";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    if (!canUseWebPushServer()) {
      return NextResponse.json(
        { error: "Push غير مهيأ على الخادم" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as SubscriptionBody;
    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const auth = body.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Subscription غير صالح" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: currentUser.userId,
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent") || null,
      },
      create: {
        userId: currentUser.userId,
        endpoint,
        p256dh,
        auth,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe POST error:", error);
    return NextResponse.json({ error: "فشل حفظ الاشتراك" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as SubscriptionBody;
    const endpoint = body.endpoint;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: currentUser.userId },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: currentUser.userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe DELETE error:", error);
    return NextResponse.json({ error: "فشل حذف الاشتراك" }, { status: 500 });
  }
}
