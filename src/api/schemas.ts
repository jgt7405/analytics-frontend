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

export const REQUEST_SCHEMAS = {
  "basketball.whatIf": conferenceAndSelections.extend({ lite: z.boolean().optional() }),
  "basketball.whatIfBaseline": z.object({ conference }),
  "basketball.nextGameImpact": z.object({ conference, team_id: id }),
  "basketball.whatIfValidationCsv": conferenceAndSelections,
  "football.whatIf": conferenceAndSelections,
  "football.whatIfExport": conferenceAndSelections.extend({
    export_options: z
      .object({
        include_all_scenarios: z.boolean(),
        num_scenarios: z.number().int().min(1).max(1000),
        start_scenario: z.number().int().min(1),
      })
      .optional(),
  }),
  "football.whatIfStructuredCsv": conferenceAndSelections,
  "football.whatIfDownload": conferenceAndSelections,
  "football.gameImpacts": z.object({
    conference,
    team_id: id,
    days: z.number().int().min(1).max(30).optional(),
    plan_only: z.boolean().optional(),
    game_ids: z.array(id).max(200).optional(),
  }),
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
