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
// POST /api/revalidate/ with a JSON body {"sport": "football" | "basketball"}.
//
// No secret: the route can only drop cached copies of public data, which the
// next request rebuilds from the backend. To keep repeat calls cheap, a sport
// cleared in the last minute is not cleared again by the same server instance
// (src/lib/revalidate-cooldown.ts).
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { dangerouslyDeleteByTag } from "@vercel/functions";
import type { Sport } from "@/config/seasons";
import { sportCacheTag } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";
import { claimClear } from "@/lib/revalidate-cooldown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPORTS: readonly Sport[] = ["basketball", "football"];
const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
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
  const now = Date.now();
  if (!claimClear(sport as Sport, now)) {
    return reply({ skipped: tag, reason: "cleared moments ago" });
  }

  // expire 0: the next request fetches fresh data instead of being answered
  // with the old copy while it refreshes, which is what this route is for.
  revalidateTag(tag, { expire: 0 });
  await dangerouslyDeleteByTag(tag);
  logger.info("revalidate", { sport, tag });
  return reply({ revalidated: tag, now: new Date(now).toISOString() });
}
