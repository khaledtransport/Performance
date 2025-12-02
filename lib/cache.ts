/**
 * Simple in-memory cache for API responses
 * يساعد على تقليل الاستعلامات المتكررة لقاعدة البيانات
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 30 * 1000; // 30 ثانية افتراضياً

  /**
   * تخزين قيمة في الكاش
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * جلب قيمة من الكاش
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // تحقق من انتهاء الصلاحية
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * حذف قيمة من الكاش
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * حذف جميع القيم التي تبدأ بـ prefix معين
   */
  invalidatePrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * حذف جميع القيم المنتهية الصلاحية
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * مسح الكاش بالكامل
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * الحصول على عدد العناصر في الكاش
   */
  size(): number {
    return this.cache.size;
  }
}

// إنشاء instance واحد للكاش
export const apiCache = new SimpleCache();

// تنظيف الكاش كل دقيقة
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    apiCache.cleanup();
  }, 60 * 1000);
}
