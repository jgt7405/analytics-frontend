interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 100;

  set<T>(key: string, data: T, ttl?: number): void {
    // Clean old entries if cache is getting too large
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.cache.delete(key));

    // If still too many entries, remove oldest ones
    if (this.cache.size >= this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.MAX_ENTRIES / 2);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize++;
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    }

    return {
      totalEntries: totalSize,
      expiredEntries: expiredCount,
      validEntries: totalSize - expiredCount,
    };
  }
}

export const cacheManager = new CacheManager();

// React Query cache configuration enhancement
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: any) =>
        failureCount < 2 && error.status !== 404,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Add request deduplication
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
    },
  },
};
