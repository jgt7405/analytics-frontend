// Rate limiting shared by every server instance, through the Upstash Redis
// store connected to the Vercel project (KV_REST_API_URL / KV_REST_API_TOKEN).
// The in-memory limiter in ./ratelimit counts per instance, so on serverless
// each instance had its own count. Without the store's settings, or if the
// store doesn't answer, this falls back to the in-memory limiter.
import "server-only";
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/ratelimit";

const STORE_TIMEOUT_MS = 2_000;

function storeConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

/** IPs aren't stored as-is: the store key is a hash of the scope and the IP. */
function storeKey(scope: string, id: string): string {
  const digest = createHash("sha256").update(`${scope}:${id}`).digest("hex").slice(0, 32);
  return `ratelimit:${scope}:${digest}`;
}

/**
 * True while `id` has made at most `limit` requests in `scope` within the
 * current window of `windowSeconds` (a fixed window that starts with the
 * first request).
 */
export async function sharedRateLimit(
  scope: string,
  id: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const config = storeConfig();
  if (!config) return rateLimit(`${scope}:${id}`, limit, windowSeconds * 1000);

  const key = storeKey(scope, id);
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      // Start the window on the first request, then count this one.
      body: JSON.stringify([
        ["SET", key, "0", "EX", String(windowSeconds), "NX"],
        ["INCR", key],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`store answered ${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const count = Number(results?.[1]?.result);
    if (!Number.isFinite(count)) throw new Error(results?.[1]?.error ?? "no count in reply");
    return count <= limit;
  } catch (error) {
    logger.warn("Shared rate limit unavailable; using the per-instance limit", {
      scope,
      reason: error instanceof Error ? error.message : String(error),
    });
    return rateLimit(`${scope}:${id}`, limit, windowSeconds * 1000);
  }
}
