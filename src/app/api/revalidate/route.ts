// src/app/api/revalidate/route.ts
// Called by the data pipeline when a sport's run finishes (the pipeline
// repo's site_cache_trigger.py). Every cache layer otherwise expires on a
// timer and then answers once more with the old copy, so the first visitor
// after a run saw last night's results (docs/decisions/cache-classes.md).
// This drops that sport's copies everywhere:
//
//   Next's data cache  revalidateTag: proxy and server fetches, and the ISR
//                      team pages built from them, go to the backend next
//   Vercel CDN         dangerouslyDeleteByTag: proxy responses carrying the
//                      tag in Vercel-Cache-Tag (a no-op outside Vercel)
//
// Browsers keep what React Query already holds until its staleTime ends.
//
// POST /api/revalidate/ with `Authorization: Bearer <REVALIDATE_SECRET>` and
// a JSON body {"sport": "football" | "basketball"}.
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { dangerouslyDeleteByTag } from "@vercel/functions";
import { revalidateSecret } from "@/config/env";
import type { Sport } from "@/config/seasons";
import { sportCacheTag } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPORTS: readonly Sport[] = ["basketball", "football"];
const NO_STORE = { "Cache-Control": "no-store" };

// Compares digests, so neither the length nor the content leaks through timing.
function matchesSecret(given: string, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(secret));
}

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const secret = revalidateSecret();
  if (!secret) return reply({ error: "Revalidation is not configured" }, 503);

  const auth = request.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!given || !matchesSecret(given, secret)) return reply({ error: "Unauthorized" }, 401);

  let sport: unknown;
  try {
    sport = ((await request.json()) as { sport?: unknown })?.sport;
  } catch {
    return reply({ error: "Invalid request body" }, 400);
  }
  if (!SPORTS.includes(sport as Sport)) {
    return reply({ error: `sport must be one of: ${SPORTS.join(", ")}` }, 400);
  }

  const tag = sportCacheTag(sport as Sport);
  // expire 0: the next request fetches fresh data instead of being answered
  // with the old copy while it refreshes, which is what this route is for.
  revalidateTag(tag, { expire: 0 });
  await dangerouslyDeleteByTag(tag);
  logger.info("revalidate", { sport, tag });
  return reply({ revalidated: tag, now: new Date().toISOString() });
}
