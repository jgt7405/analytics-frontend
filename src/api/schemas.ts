// Zod schemas for the backend contract (docs/ARCHITECTURE_PLAN.md step 4,
// item 6), keyed by endpoint (./endpoints.ts). Used by the proxy only, so
// Zod never reaches browser bundles through this file.
//
// - Request schemas: every JSON POST body is parsed before it is forwarded,
//   and only the parsed result is sent on. A body that doesn't match is a
//   400, and fields the site never sends are dropped (the backend reads some,
//   e.g. game-impacts' max_sims and force_live, that would let any caller
//   request expensive simulations).
// - Response schemas: the shared envelope of the conference tables. A
//   mismatch is logged as drift and the response still goes out: the
//   backend owns response shapes (docs/data-flow.md, "Contract with the
//   backend"), and a warning is more useful than a broken page.
//
// Validating large historical or chart payloads is deliberately left out;
// see scripts/zod-cost.mjs and the step 4 outcome for the measured cost.

import { z } from "zod";
import type { EndpointKey } from "./endpoints";

// --- Requests ----------------------------------------------------------------

const conference = z.string().min(1).max(80).regex(/^[\p{L}\p{N} _.&'()-]+$/u);
const id = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d{1,12}$/),
]);
const selections = z
  .array(z.object({ game_id: id, winner_team_id: id }))
  .max(500);

const conferenceAndSelections = z.object({ conference, selections });

// One anonymous usage event (PageTracker, src/lib/usage-tracking.ts).
const siteUsageEvent = z.object({
  event_type: z.enum(["page_view", "filter_change", "page_exit", "feature", "web_vital", "error", "outbound", "compare"]),
  path: z.string().startsWith("/").max(240),
  sport: z.enum(["basketball", "football"]).nullable().optional(),
  page: z.string().max(80).nullable().optional(),
  conference: z.string().max(120).nullable().optional(),
  team: z.string().max(120).nullable().optional(),
  visitor_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  // Sent on the first page view of a visit only (PageTracker).
  entry: z.boolean().optional(),
  referrer: z.string().max(500).nullable().optional(),
  utm_source: z.string().max(100).nullable().optional(),
  utm_medium: z.string().max(100).nullable().optional(),
  utm_campaign: z.string().max(100).nullable().optional(),
  utm_term: z.string().max(100).nullable().optional(),
  utm_content: z.string().max(100).nullable().optional(),
  // Statistics page, second section: see SiteUsageEvent in src/types/statistics.ts.
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  display_mode: z.enum(["browser", "standalone"]).optional(),
  time_zone: z.string().max(64).nullable().optional(),
  conference_defaulted: z.boolean().optional(),
  automated: z.boolean().optional(),
  view_id: z.string().uuid().optional(),
  engaged_ms: z.number().int().min(0).max(86_400_000).optional(),
  scroll_pct: z.number().int().min(0).max(100).optional(),
  detail: z.string().max(120).nullable().optional(),
  label: z.string().max(500).nullable().optional(),
  metric_value: z.number().finite().optional(),
  // compare: the teams on a Compare Schedules page (src/hooks/useCompareTracking.ts).
  // Football allows 12 teams (basketball 10). Keep in step with the backend's
  // MAX_COMPARE_TEAMS: one oversized list rejects its whole batch.
  teams: z.array(z.string().min(1).max(60)).min(1).max(12).optional(),
});

export const REQUEST_SCHEMAS = {
  "basketball.whatIf": conferenceAndSelections.extend({ lite: z.boolean().optional() }),
  "basketball.whatIfBaseline": z.object({ conference }),
  "basketball.nextGameImpact": z.object({ conference, team_id: id }),
  "basketball.whatIfValidationCsv": conferenceAndSelections,
  "football.whatIf": conferenceAndSelections,
  "football.gameImpacts": z.object({
    conference,
    team_id: id,
    days: z.number().int().min(1).max(30).optional(),
    plan_only: z.boolean().optional(),
    game_ids: z.array(id).max(200).optional(),
  }),
  "basketball.statisticsEvent": z.union([siteUsageEvent, z.object({ events: z.array(siteUsageEvent).min(1).max(25) })]),
} satisfies Partial<Record<EndpointKey, z.ZodTypeAny>>;

/** Largest scatterplot CSV the chart page may upload. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// --- Responses ---------------------------------------------------------------

// { data: [{ team_name, ... }], conferences?: [...] }: every conference table.
const teamTable = z
  .object({
    data: z.array(z.object({ team_name: z.string() }).passthrough()),
    conferences: z.array(z.string()).optional(),
  })
  .passthrough();

export const RESPONSE_SCHEMAS = {
  "basketball.standings": teamTable,
  "basketball.seed": teamTable,
  "basketball.confTourney": teamTable,
  "basketball.ncaaTourney": teamTable,
  "basketball.twv": teamTable,
  "football.standings": teamTable,
  "football.seed": teamTable,
  "football.cfp": teamTable,
  "football.confChamp": teamTable,
  "football.twv": teamTable,
} satisfies Partial<Record<EndpointKey, z.ZodTypeAny>>;

export function requestSchemaFor(key: string): z.ZodTypeAny | undefined {
  return (REQUEST_SCHEMAS as Record<string, z.ZodTypeAny>)[key];
}

export function responseSchemaFor(key: string): z.ZodTypeAny | undefined {
  return (RESPONSE_SCHEMAS as Record<string, z.ZodTypeAny>)[key];
}
