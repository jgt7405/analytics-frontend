// Server-side environment configuration. Import only from server code
// (route handlers, server components, src/lib/server-api.ts, sitemap); the
// "server-only" import makes a client-side import a build error.
import "server-only";

const DEFAULT_BACKEND_API_URL = "https://jthomprodbackend-production.up.railway.app/api";

function readBackendApiUrl(): string {
  // BACKEND_API_URL is the one supported name. NEXT_PUBLIC_BACKEND_URL is read
  // as a fallback so existing deployments keep working; remove it once no
  // environment sets it (it was only ever used server-side).
  const raw =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_API_URL;
  const trimmed = raw.replace(/\/+$/, "");
  try {
    new URL(trimmed);
  } catch {
    throw new Error(`BACKEND_API_URL is not a valid URL: "${raw}"`);
  }
  return trimmed;
}

/** Base URL of the Flask backend API, without a trailing slash. */
export const BACKEND_API_URL = readBackendApiUrl();

/**
 * Shared secret the data pipeline sends to /api/revalidate after a run.
 * Undefined when unset: the route then refuses every request.
 */
export function revalidateSecret(): string | undefined {
  return process.env.REVALIDATE_SECRET || undefined;
}

/**
 * Shared secret the proxy sends to the backend with a visitor's address, so
 * the backend believes X-Client-IP only from this app. Must match the
 * backend's PROXY_SHARED_SECRET. Undefined when unset: nothing is sent.
 */
export function proxySharedSecret(): string | undefined {
  return process.env.PROXY_SHARED_SECRET || undefined;
}
