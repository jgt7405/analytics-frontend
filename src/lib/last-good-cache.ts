// The last good GET response per backend URL, kept in this server
// instance's memory. The proxy (src/app/api/proxy/[...slug]/route.ts)
// answers it only when the backend fails or times out.
//
// Not Next's data cache: on Vercel its entries kept serving the pre-run copy
// for hours after a pipeline run, even past /api/revalidate (2026-11-02,
// docs/decisions/cache-classes.md). Bounded by total size; the least
// recently stored entries go first.

import "server-only";

export interface SavedResponse {
  body: string;
  disposition: string | null;
}

const MAX_BYTES = 64 * 1024 * 1024;
const saved = new Map<string, SavedResponse>();
let totalBytes = 0;

export function rememberLastGood(url: string, response: SavedResponse) {
  const previous = saved.get(url);
  if (previous) {
    totalBytes -= previous.body.length;
    saved.delete(url);
  }
  if (response.body.length > MAX_BYTES) return;
  saved.set(url, response);
  totalBytes += response.body.length;
  for (const [oldest, entry] of saved) {
    if (totalBytes <= MAX_BYTES) break;
    saved.delete(oldest);
    totalBytes -= entry.body.length;
  }
}

export function lastGood(url: string): SavedResponse | undefined {
  return saved.get(url);
}

/** Test hook: forget every saved response. */
export function clearLastGood() {
  saved.clear();
  totalBytes = 0;
}
