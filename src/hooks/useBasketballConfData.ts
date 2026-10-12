import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiUrl } from "@/api/urls";
import { queryCachePolicy } from "@/lib/cache-policy";

export interface WinProbQuartiles {
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
}

/** Opponent a win probability is measured against: the average D1 team, or
 * the teams ranked #100 / #50 in the combo ratings. Always a neutral site. */
export type WinProbOpponent = "avg" | "rk100" | "rk50";

export interface ConferenceTeamWinProb {
  team_name: string;
  logo_url: string;
  netrtg: number;
  win_prob_avg: number;
  win_prob_rk100: number;
  win_prob_rk50: number;
}

export interface ConferenceData {
  conference_name: string;
  teamcount: number;
  teams: string[];
  netrtg_min: number;
  netrtg_q25: number;
  netrtg_median: number;
  netrtg_q75: number;
  netrtg_max: number;
  bid_distribution: Record<string, number>;
  average_bids: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  winprob?: Partial<Record<WinProbOpponent, WinProbQuartiles>>;
  team_winprobs?: ConferenceTeamWinProb[];
}

export interface TeamNonconfAnalysis {
  team_name: string;
  power_record: string;
  power_win_pct: number;
  power_twv_50: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv_50: number;
  total_record: string;
  total_win_pct: number;
  total_twv_50: number;
}

export interface NonconfAnalysis {
  team_conf: string;
  power_record: string;
  power_win_pct: number;
  power_twv_50: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv_50: number;
  total_record: string;
  total_win_pct: number;
  total_twv_50: number;
  teams: TeamNonconfAnalysis[];
}

interface BasketballConfDataResponse {
  data: ConferenceData[];
  /** Net rating of each win-probability opponent (avg, #100, #50). */
  winprob_baselines?: Partial<Record<WinProbOpponent, number>>;
}

interface BasketballNonconfAnalysisResponse {
  data: NonconfAnalysis[];
  conferences: string[];
}

export interface CombinedBasketballConfResponse {
  conferenceData: BasketballConfDataResponse;
  nonconfData: BasketballNonconfAnalysisResponse;
}

export function useBasketballConfData(season?: string, initialData?: CombinedBasketballConfResponse) {
  return useQuery<CombinedBasketballConfResponse>({
    queryKey: queryKeys.basketball.confData(season),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    queryFn: async () => {
      const [confResponse, nonconfResponse] = await Promise.all([
        fetch(apiUrl("basketball.conferenceData", {}, { season })),
        fetch(
          apiUrl("basketball.nonconfAnalysis", { conference: "All_Teams" }, { season }),
        ),
      ]);

      if (!confResponse.ok) {
        throw new Error("Failed to fetch basketball conference data");
      }

      if (!nonconfResponse.ok) {
        throw new Error("Failed to fetch non-conference analysis data");
      }

      const conferenceData = await confResponse.json();
      const nonconfData = await nonconfResponse.json();

      // Sort non-conference data by total_twv_50 descending (biggest to smallest)
      nonconfData.data.sort(
        (a: NonconfAnalysis, b: NonconfAnalysis) => b.total_twv_50 - a.total_twv_50
      );

      return {
        conferenceData,
        nonconfData,
      };
    },
    ...queryCachePolicy("currentStandings"),
  });
}