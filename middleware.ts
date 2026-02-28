import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET_BYTES } from "@/lib/jwt-config";
import { checkRateLimit, rateLimiter, authRateLimiter, trackingRateLimiter, getClientIP } from "@/lib/rate-limit";

const JWT_SECRET = JWT_SECRET_BYTES;

// المسارات العامة التي لا تحتاج مصادقة
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health", "/offline"];

// المسارات المحمية حسب الدور
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN", "MANAGER"],
  "/api/admin": ["ADMIN", "MANAGER"],
  "/api/auth/register": ["ADMIN"],
  "/driver": ["DRIVER"],
  "/api/driver/": ["DRIVER"],
};

// المسارات المحظورة على السائق
const DRIVER_BLOCKED_PATHS = [
  "/dashboard",
  "/tracking",
  "/reports",
  "/delegate",
  "/admin",
  "/api/admin",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cleanPath = pathname.replace("/Performance", "");

  // Rate Limiting باستخدام Upstash Redis (يعمل على Edge و Serverless)
  if (cleanPath.startsWith("/api/")) {
    const ip = getClientIP(request);
    
    // اختيار المحدد المناسب حسب نوع الطلب
    let limiter = rateLimiter;
    if (cleanPath.startsWith("/api/auth/login")) {
      limiter = authRateLimiter; // 5 محاولات / دقيقة
    } else if (cleanPath.startsWith("/api/tracking") || cleanPath.startsWith("/api/driver/")) {
      limiter = trackingRateLimiter; // 60 طلب / 10 ثوانٍ
    }

    const { success, limit, remaining, reset } = await checkRateLimit(ip, limiter);
    
    if (!success) {
      return NextResponse.json(
        { error: "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً." },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // تجاوز الملفات الثابتة و API الصحة
  if (
    cleanPath.startsWith("/_next") ||
    cleanPath.startsWith("/favicon") ||
    cleanPath.startsWith("/manifest") ||
    cleanPath.startsWith("/sw.js") ||
    cleanPath.startsWith("/icons") ||
    cleanPath.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // المسارات العامة
  if (isPublicPath(cleanPath)) {
    return NextResponse.next();
  }

  // التحقق من المصادقة
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // API routes ترجع 401
    if (cleanPath.startsWith("/api/")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    // الصفحات تذهب لتسجيل الدخول
    const loginUrl = new URL("/Performance/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // السائق: إذا دخل الصفحة الرئيسية → توجيه لصفحة السائق
    if (userRole === "DRIVER" && (cleanPath === "/" || cleanPath === "")) {
      return NextResponse.redirect(new URL("/Performance/driver", request.url));
    }

    // السائق: حظر الوصول للصفحات الإدارية
    if (userRole === "DRIVER") {
      for (const blocked of DRIVER_BLOCKED_PATHS) {
        if (cleanPath.startsWith(blocked)) {
          if (cleanPath.startsWith("/api/")) {
            return NextResponse.json(
              { error: "ليس لديك صلاحية للوصول" },
              { status: 403 }
            );
          }
          return NextResponse.redirect(new URL("/Performance/driver", request.url));
        }
      }
    }

    // التحقق من الصلاحيات للمسارات المحمية
    for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
      if (cleanPath.startsWith(route) && !roles.includes(userRole)) {
        if (cleanPath.startsWith("/api/")) {
          return NextResponse.json(
            { error: "ليس لديك صلاحية للوصول" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/Performance", request.url));
      }
    }

    // إضافة معلومات المستخدم للهيدرز
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-user-role", userRole);
    return response;
  } catch {
    // توكن غير صالح
    const response = cleanPath.startsWith("/api/")
      ? NextResponse.json({ error: "جلسة منتهية" }, { status: 401 })
      : NextResponse.redirect(new URL("/Performance/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/:path*"],
};  
