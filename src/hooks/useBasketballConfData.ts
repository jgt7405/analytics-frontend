import { useQuery } from "@tanstack/react-query";

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
}

export interface TeamNonconfAnalysis {
  team_name: string;
  power_record: string;
  power_win_pct: number;
  power_twv: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv: number;
  total_record: string;
  total_win_pct: number;
  total_twv: number;
}

export interface NonconfAnalysis {
  team_conf: string;
  power_record: string;
  power_win_pct: number;
  power_twv: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv: number;
  total_record: string;
  total_win_pct: number;
  total_twv: number;
  teams: TeamNonconfAnalysis[];
}

interface BasketballConfDataResponse {
  data: ConferenceData[];
}

interface BasketballNonconfAnalysisResponse {
  data: NonconfAnalysis[];
  conferences: string[];
}

interface CombinedBasketballConfResponse {
  conferenceData: BasketballConfDataResponse;
  nonconfData: BasketballNonconfAnalysisResponse;
}

export function useBasketballConfData() {
  return useQuery<CombinedBasketballConfResponse>({
    queryKey: ["basketball-conf-data"],
    queryFn: async () => {
      const [confResponse, nonconfResponse] = await Promise.all([
        fetch("/api/proxy/unified_conference_data"),
        fetch("/api/proxy/basketball/nonconf_analysis/All_Teams"),
      ]);

      if (!confResponse.ok) {
        throw new Error("Failed to fetch basketball conference data");
      }

      if (!nonconfResponse.ok) {
        throw new Error("Failed to fetch non-conference analysis data");
      }

      const conferenceData = await confResponse.json();
      const nonconfData = await nonconfResponse.json();

      // Sort non-conference data by total_twv descending (biggest to smallest)
      nonconfData.data.sort(
        (a: NonconfAnalysis, b: NonconfAnalysis) => b.total_twv - a.total_twv
      );

      return {
        conferenceData,
        nonconfData,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
