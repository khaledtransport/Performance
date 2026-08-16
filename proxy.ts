import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET_BYTES } from "@/lib/jwt-config";
import { checkRateLimit, rateLimiter, authRateLimiter, trackingRateLimiter, getClientIP } from "@/lib/rate-limit";
import {
  API_ROLE_RULES,
  PAGE_ROLE_RULES,
  getRequiredRoles,
  hasRole,
  roleHomePath,
} from "@/lib/rbac";

const JWT_SECRET = JWT_SECRET_BYTES;

// المسارات العامة التي لا تحتاج مصادقة
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health", "/offline"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cleanPath = pathname.replace("/Performance", "");

  // تجاوز الملفات الثابتة والأيقونات والـ Service Worker فوراً
  if (
    cleanPath.startsWith("/_next") ||
    cleanPath.startsWith("/favicon") ||
    cleanPath.startsWith("/manifest") ||
    cleanPath.startsWith("/sw.js") ||
    cleanPath.startsWith("/icons") ||
    cleanPath.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|webp|ttf)$/)
  ) {
    return NextResponse.next();
  }

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

    const roleRules = cleanPath.startsWith("/api/")
      ? API_ROLE_RULES
      : PAGE_ROLE_RULES;
    const requiredRoles = getRequiredRoles(cleanPath || "/", request.method, roleRules);

    if (requiredRoles && !hasRole(userRole, requiredRoles)) {
      if (cleanPath.startsWith("/api/")) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية للوصول" },
          { status: 403 }
        );
      }

      return NextResponse.redirect(new URL(roleHomePath(userRole), request.url));
    }

    if (!cleanPath.startsWith("/api/") && (cleanPath === "/" || cleanPath === "")) {
      const home = roleHomePath(userRole);
      if (home !== "/Performance") {
        return NextResponse.redirect(new URL(home, request.url));
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
