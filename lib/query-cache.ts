// Advanced query cache with automatic invalidation
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttls = new Map<string, number>();
  private invalidationPatterns = new Map<string, Set<string>>();

  set(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, { data, timestamp: Date.now() });
    this.ttls.set(key, ttl);

    // Schedule invalidation
    setTimeout(() => {
      this.cache.delete(key);
      this.ttls.delete(key);
    }, ttl);
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const ttl = this.ttls.get(key) || 0;
    const isExpired = Date.now() - item.timestamp > ttl;

    if (isExpired) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return item.data;
  }

  // Invalidate all keys matching a pattern
  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => {
      this.cache.delete(k);
      this.ttls.delete(k);
    });
  }

  // Invalidate related keys when data changes
  registerInvalidation(pattern: string, relatedPatterns: string[]) {
    this.invalidationPatterns.set(pattern, new Set(relatedPatterns));
  }

  invalidateRelated(pattern: string) {
    const related = this.invalidationPatterns.get(pattern);
    if (related) {
      const relPatterns = Array.from(related);
      relPatterns.forEach((relPattern) => {
        this.invalidatePattern(relPattern);
      });
    }
    this.invalidatePattern(pattern);
  }

  clear() {
    this.cache.clear();
    this.ttls.clear();
    this.invalidationPatterns.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const queryCache = new QueryCache();

// Register automatic invalidation relationships
queryCache.registerInvalidation("buses", ["routes", "admin/buses"]);
queryCache.registerInvalidation("drivers", ["routes", "admin/drivers"]);
queryCache.registerInvalidation("universities", [
  "routes",
  "admin/universities",
]);
queryCache.registerInvalidation("districts", [
  "buses",
  "routes",
  "admin/districts",
]);
queryCache.registerInvalidation("routes", ["admin/routes", "dashboard"]);
