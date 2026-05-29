// src/lib/server-api.ts
// Server-side data fetching for SSR/ISR. Runs in Server Components only.
//
// The client API layer (src/services/*) talks to the relative "/api/proxy"
// route and references window.location, so it cannot run on the server. These
// helpers hit the backend directly and return the SAME JSON shape the client
// hooks expect, so the result can be handed to React Query as `initialData`.
// Each returns `undefined` on failure so the client can still fetch on mount.

import type { StandingsApiResponse } from "@/types/basketball";
import type { FootballStandingsApiResponse } from "@/types/football";
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

export function getStandingsServer(conference: string, season?: string) {
  const conf = conference.replace(/ /g, "_");
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  return fetchJson<StandingsApiResponse>(`/standings/${conf}${q}`);
}

export function getFootballStandingsServer(conference: string, season?: string) {
  const conf = conference.replace(/ /g, "_");
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  return fetchJson<FootballStandingsApiResponse>(
    `/football/standings/${conf}${q}`,
  );
}

export function getTeamDataServer(teamName: string) {
  return fetchJson<TeamData>(`/team/${encodeURIComponent(teamName)}`);
}

export function getFootballTeamServer(teamName: string) {
  return fetchJson<FootballTeamData>(
    `/football_team/${encodeURIComponent(teamName)}`,
  );
}
