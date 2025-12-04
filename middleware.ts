import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// معدل الحد الأقصى للطلبات (Rate Limiting)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// تنظيف البيانات القديمة كل 10 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimit.entries()) {
    if (now > data.resetTime) {
      rateLimit.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // تطبيق Rate Limiting على API routes فقط
  if (pathname.startsWith('/Performance/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const limit = rateLimit.get(ip);

    if (limit && now < limit.resetTime) {
      if (limit.count >= 100) { // 100 طلب في الدقيقة
        return NextResponse.json(
          { error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.' },
          { status: 429 }
        );
      }
      limit.count++;
    } else {
      // إنشاء سجل جديد أو إعادة تعيين السجل القديم
      rateLimit.set(ip, { count: 1, resetTime: now + 60000 }); // دقيقة واحدة
    }
  }

  return NextResponse.next();
}

// تطبيق middleware على جميع المسارات
export const config = {
  matcher: ['/:path*']
};
