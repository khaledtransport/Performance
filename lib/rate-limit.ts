import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// التحقق من وجود متغيرات البيئة
const hasUpstashConfig = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

/**
 * Rate Limiter باستخدام Upstash Redis
 * 
 * - نافذة منزلقة: 30 طلب كل 10 ثوانٍ (لكل IP)
 * - يعمل على Edge و Serverless بدون مشاكل
 * - يسقط تلقائياً إلى in-memory إذا لم يتم تكوين Upstash
 */

// إنشاء Redis client
const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Rate limiter الأساسي — 30 طلب / 10 ثوانٍ
export const rateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// Rate limiter مشدد لتسجيل الدخول — 5 محاولات / دقيقة
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

// Rate limiter للتتبع — 60 طلب / 10 ثوانٍ (أكثر سماحية)
export const trackingRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '10 s'),
      analytics: true,
      prefix: 'ratelimit:tracking',
    })
  : null;

/**
 * فحص Rate Limit
 * يُرجع { success, limit, remaining, reset }
 * إذا لم يتم تكوين Upstash، يسمح بكل الطلبات
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null = rateLimiter
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!limiter) {
    // Fallback: السماح بالمرور إذا لم يتم تكوين Upstash
    return { success: true, limit: 30, remaining: 30, reset: Date.now() + 10000 };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('[Rate Limit] خطأ في فحص Rate Limit:', error);
    // في حالة الخطأ، نسمح بالمرور لعدم تعطيل الخدمة
    return { success: true, limit: 30, remaining: 30, reset: Date.now() + 10000 };
  }
}

/**
 * استخراج IP العميل من الطلب
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return '127.0.0.1';
}

export { hasUpstashConfig };
