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
} from "@/services/basketball-api";
import type {
  FootballStandingsApiResponse,
  FootballCFPApiResponse,
  FootballConfChampApiResponse,
  FootballSeedApiResponse,
  FootballCWVApiResponse,
  FootballScheduleResponse,
} from "@/types/football";
import type { TeamData } from "@/hooks/useBasketballTeamData";
import type { FootballTeamData } from "@/hooks/useFootballTeam";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://jthomprodbackend-production.up.railway.app/api";

async function fetchJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

// Build "/base/Conf_Name?season=" the same way the client API does.
function confPath(base: string, conference: string, season?: string) {
  const conf = conference.replace(/ /g, "_");
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  return `${base}/${conf}${q}`;
}

// --- Basketball -------------------------------------------------------------
export const getStandingsServer = (c: string, s?: string) =>
  fetchJson<StandingsApiResponse>(confPath("/standings", c, s));
export const getSeedServer = (c: string, s?: string) =>
  fetchJson<SeedApiResponse>(confPath("/seed", c, s));
export const getNCAATourneyServer = (c: string, s?: string) =>
  fetchJson<NCAATeamApiResponse>(confPath("/ncaa_tourney", c, s));
export const getConfTourneyServer = (c: string, s?: string) =>
  fetchJson<ConfTourneyApiResponse>(confPath("/conf_tourney", c, s));
export const getCWVServer = (c: string, s?: string) =>
  fetchJson<CWVApiResponse>(confPath("/cwv", c, s));
export const getScheduleServer = (c: string, s?: string) =>
  fetchJson<ScheduleApiResponse>(confPath("/conf_schedule", c, s));
export const getTeamDataServer = (teamName: string) =>
  fetchJson<TeamData>(`/team/${encodeURIComponent(teamName)}`);

// --- Football ---------------------------------------------------------------
export const getFootballStandingsServer = (c: string, s?: string) =>
  fetchJson<FootballStandingsApiResponse>(confPath("/football/standings", c, s));
export const getFootballCFPServer = (c: string, s?: string) =>
  fetchJson<FootballCFPApiResponse>(confPath("/cfp", c, s));
export const getFootballConfChampServer = (c: string, s?: string) =>
  fetchJson<FootballConfChampApiResponse>(
    confPath("/football/conf_champ", c, s),
  );
export const getFootballSeedServer = (c: string, s?: string) =>
  fetchJson<FootballSeedApiResponse>(confPath("/football_seed", c, s));
export const getFootballCWVServer = (c: string, s?: string) =>
  fetchJson<FootballCWVApiResponse>(confPath("/football/cwv", c, s));
export const getFootballScheduleServer = (c: string, s?: string) =>
  fetchJson<FootballScheduleResponse>(
    confPath("/football/conf_schedule", c, s),
  );
export const getFootballTeamServer = (teamName: string) =>
  fetchJson<FootballTeamData>(
    `/football_team/${encodeURIComponent(teamName)}`,
  );

// --- Team lists (for the SSR crawlable team index on /teams hubs) -----------
// The backend returns { data: [{ team_name, conference, ... }] }. We only need
// name + conference to render the link index, so the shape is kept minimal.
export interface TeamListEntry {
  team_name: string;
  conference: string;
}
export const getBasketballTeamsServer = () =>
  fetchJson<{ data: TeamListEntry[] }>("/basketball_teams");
export const getFootballTeamsServer = () =>
  fetchJson<{ data: TeamListEntry[] }>("/football_teams");
