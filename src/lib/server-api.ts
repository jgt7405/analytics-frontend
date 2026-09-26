// src/lib/server-api.ts
// Server-side data fetching for SSR/ISR. Runs in Server Components only.
//
// The client API layer (src/services/*) talks to the relative "/api/proxy"
// route and references window.location, so it cannot run on the server. These
// helpers hit the backend directly and return the SAME JSON shape the client
// hooks expect, so the result can be handed to React Query as `initialData`.
// Each returns `undefined` on failure so the client can still fetch on mount.

import type { StandingsApiResponse } from "@/types/basketball";
import type {
  CWVApiResponse,
  NCAATeamApiResponse,
  ScheduleApiResponse,
} from "@/types/basketball";
import type {
  SeedApiResponse,
  ConfTourneyApiResponse,
  TWVApiResponse,
} from "@/services/basketball-api";
import type {
  FootballStandingsApiResponse,
  FootballCFPApiResponse,
  FootballConfChampApiResponse,
  FootballSeedApiResponse,
  FootballCWVApiResponse,
  FootballScheduleResponse,
  FootballConferenceApiResponse,
  FootballTWVApiResponse,
} from "@/types/football";
import type { TeamData } from "@/hooks/useBasketballTeamData";
import type { FootballTeamData } from "@/hooks/useFootballTeam";
import type { NCAAProjectionsResponse } from "@/hooks/useNCAAProjections";
import type { CombinedBasketballConfResponse } from "@/hooks/useBasketballConfData";
import type { PlayoffRankingsResponse } from "@/types/football";
import { BACKEND_API_URL } from "@/config/env";
import { CACHE_POLICIES, cacheClassFor } from "@/lib/cache-policy";
import type { EndpointKey } from "@/api/endpoints";
import { backendRequest, type EndpointParams, type EndpointQuery } from "@/api/urls";
import { logger } from "@/lib/logger";

const BACKEND = BACKEND_API_URL;

// Fetches an endpoint from the backend directly, with the path, parameter
// rules and cache lifetime of its entry in src/api/endpoints.ts: the same
// freshness class the proxy uses for the CDN. Failed responses aren't cached
// by Next's data cache. A parameter that breaks its rule (e.g. a team name
// from the URL with a "/") returns undefined without calling the backend.
async function fetchEndpoint<T>(
  key: EndpointKey,
  params: EndpointParams = {},
  query: EndpointQuery = {},
): Promise<T | undefined> {
  let request: ReturnType<typeof backendRequest>;
  try {
    request = backendRequest(key, params, query);
  } catch (error) {
    logger.warn("Server fetch skipped", { key, error: String(error) });
    return undefined;
  }
  const cacheClass = cacheClassFor(request.endpoint, query.season);
  try {
    const res = await fetch(`${BACKEND}${request.path}`, {
      next: { revalidate: CACHE_POLICIES[cacheClass].revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

// Conference names travel with "_" for spaces, as the client sends them.
const conf = (conference: string) => ({ conference: conference.replace(/ /g, "_") });

// --- Basketball -------------------------------------------------------------
export const getStandingsServer = (c: string, season?: string) =>
  fetchEndpoint<StandingsApiResponse>("basketball.standings", conf(c), { season });
export const getSeedServer = (c: string, season?: string) =>
  fetchEndpoint<SeedApiResponse>("basketball.seed", conf(c), { season });
export const getNCAATourneyServer = (c: string, season?: string) =>
  fetchEndpoint<NCAATeamApiResponse>("basketball.ncaaTourney", conf(c), { season });
export const getConfTourneyServer = (c: string, season?: string) =>
  fetchEndpoint<ConfTourneyApiResponse>("basketball.confTourney", conf(c), { season });
export const getCWVServer = (c: string, season?: string) =>
  fetchEndpoint<CWVApiResponse>("basketball.cwv", conf(c), { season });
export const getScheduleServer = (c: string, season?: string) =>
  fetchEndpoint<ScheduleApiResponse>("basketball.confSchedule", conf(c), { season });
export const getTeamDataServer = (teamName: string) =>
  fetchEndpoint<TeamData>("basketball.team", { team: teamName });

// --- Football ---------------------------------------------------------------
export const getFootballStandingsServer = (c: string, season?: string) =>
  fetchEndpoint<FootballStandingsApiResponse>("football.standings", conf(c), { season });
export const getFootballCFPServer = (c: string, season?: string) =>
  fetchEndpoint<FootballCFPApiResponse>("football.cfp", conf(c), { season });
export const getFootballConfChampServer = (c: string, season?: string) =>
  fetchEndpoint<FootballConfChampApiResponse>("football.confChamp", conf(c), { season });
export const getFootballSeedServer = (c: string, season?: string) =>
  fetchEndpoint<FootballSeedApiResponse>("football.seed", conf(c), { season });
export const getFootballCWVServer = (c: string, season?: string) =>
  fetchEndpoint<FootballCWVApiResponse>("football.cwv", conf(c), { season });
export const getFootballScheduleServer = (c: string, season?: string) =>
  fetchEndpoint<FootballScheduleResponse>("football.confSchedule", conf(c), { season });
export const getFootballTeamServer = (teamName: string) =>
  fetchEndpoint<FootballTeamData>("football.team", { team: teamName });

// --- Basketball tournament projections (no conference param) ----------------
export const getNCAAProjectionsServer = (season?: string) =>
  fetchEndpoint<NCAAProjectionsResponse>("basketball.ncaaProjections", {}, { season });

// --- Football playoff rankings (season mode) ---------------------------------
// The backend path has no conference segment; the endpoint list maps the
// client's /All_Teams placeholder away (src/api/endpoints.ts).
export const getFootballPlayoffRankingsServer = (season?: string) =>
  fetchEndpoint<PlayoffRankingsResponse>("football.playoffRankings", {}, { season });

// --- TWV --------------------------------------------------------------------
export const getBasketballTWVServer = (c: string, season?: string) =>
  fetchEndpoint<TWVApiResponse>("basketball.twv", conf(c), { season });
export const getFootballTWVServer = (c: string, season?: string) =>
  fetchEndpoint<FootballTWVApiResponse>("football.twv", conf(c), { season });

// --- Basketball conf-data (two parallel fetches combined) -------------------
export type BasketballConfDataServerResult = CombinedBasketballConfResponse;
export const getBasketballConfDataServer = async (
  season?: string,
): Promise<BasketballConfDataServerResult | undefined> => {
  const [conferenceData, nonconfData] = await Promise.all([
    fetchEndpoint<CombinedBasketballConfResponse["conferenceData"]>(
      "basketball.conferenceData", {}, { season },
    ),
    fetchEndpoint<CombinedBasketballConfResponse["nonconfData"]>(
      "basketball.nonconfAnalysis", { conference: "All_Teams" }, { season },
    ),
  ]);
  if (!conferenceData || !nonconfData) return undefined;
  nonconfData.data?.sort((a, b) => b.total_twv_50 - a.total_twv_50);
  return { conferenceData, nonconfData };
};

// --- Football conf-data -----------------------------------------------------
export const getFootballConfDataServer = (season?: string) =>
  fetchEndpoint<FootballConferenceApiResponse>("football.conferenceData", {}, { season });

// --- Team lists (for the SSR crawlable team index on /teams hubs) -----------
// The backend returns { data: [{ team_name, conference, ... }] }. We only need
// name + conference to render the link index, so the shape is kept minimal.
export interface TeamListEntry {
  team_name: string;
  conference: string;
}
export const getBasketballTeamsServer = () =>
  fetchEndpoint<{ data: TeamListEntry[] }>("basketball.teams");
export const getFootballTeamsServer = () =>
  fetchEndpoint<{ data: TeamListEntry[] }>("football.teams");
