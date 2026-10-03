interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(ip: string, limit: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * The visitor's IP from the request headers (on Vercel, x-forwarded-for's
 * first entry is the client). Takes the Headers object itself: indexing it
 * like a plain object returns undefined, which used to put every visitor
 * in one "unknown" bucket.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// Cleanup old entries every 10 minutes. unref() so the timer never keeps a
// process (a test run, a build step) alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 600000).unref?.();
