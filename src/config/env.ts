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
