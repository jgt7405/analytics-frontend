// src/services/football-api.ts
// Football-specific API methods and the combined ApiClient

import { sanitizeInput } from "@/lib/validation";
import {
  FootballCFPApiResponse,
  FootballConfChampApiResponse,
  FootballConferenceApiResponse,
  FootballCWVApiResponse,
  FootballPlayoffApiResponse,
  FootballScheduleResponse,
  FootballSeedApiResponse,
  FootballStandingsApiResponse,
  FootballTeamsApiResponse,
} from "@/types/football";
import { BasketballApiClient } from "./basketball-api";

// Football-specific response interface (renamed from FootballTeamData to avoid collision with src/types/football.ts)
interface FootballTeamDetailData {
  team_info: {
    team_name: string;
    team_id: string;
    conference: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    overall_record: string;
    conference_record: string;
    cfp_bid_pct?: number;
    average_seed?: number;
    sagarin_rank?: number;
    rating?: number;
    seed_distribution: Record<string, number>;
    win_seed_counts: Array<{
      Seed: string | number;
      Percentage: number;
      Tournament_Status: string;
      Wins: number;
      Count: number;
      Conf_Champ_Pct?: number;
      At_Large_Pct?: number;
    }>;
  };
  schedule: Array<{
    date: string;
    opponent: string;
    opponent_logo?: string;
    opponent_primary_color?: string;
    location: string;
    status: string;
    twv?: number;
    cwv?: number;
    sagarin_rank?: number;
    opp_rnk?: number;
    team_win_prob?: number;
    sag12_win_prob?: number;
    team_points?: number;
    opp_points?: number;
    team_conf?: string;
    team_conf_catg?: string;
  }>;
  all_schedule_data: Array<{
    team: string;
    opponent: string;
    opponent_primary_color?: string;
    sag12_win_prob: number;
    team_conf: string;
    team_conf_catg: string;
    status: string;
  }>;
}

const API_BASE_URL = "/api/proxy";

export class ApiClient extends BasketballApiClient {
  // Football API methods
  async getFootballStandings(
    conference: string,
    season?: string,
  ): Promise<FootballStandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football standings for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      `/football/standings/${formattedConf}${seasonQuery}`,
      (data) => ({
        success: true,
        data: data as FootballStandingsApiResponse,
        error: null,
      }),
    );
  }

  async getFootballSchedule(
    conference: string,
    season?: string,
  ): Promise<FootballScheduleResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football schedule for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      `/football/conf_schedule/${formattedConf}${seasonQuery}`,
      (data) => ({
        success: true,
        data: data as FootballScheduleResponse,
        error: null,
      }),
    );
  }

  async getFootballTWV(
    conference: string,
    season?: string,
  ): Promise<any> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football TWV for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(`/football/twv/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data,
      error: null,
    }));
  }

  async getFootballCWV(
    conference: string,
    season?: string,
  ): Promise<FootballCWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football CWV for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      `/football/cwv/${formattedConf}${seasonQuery}`,
      (data) => ({
        success: true,
        data: data as FootballCWVApiResponse,
        error: null,
      }),
    );
  }

  async getFootballPlayoffs(
    conference: string,
  ): Promise<FootballPlayoffApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football playoffs for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(`/football/playoffs/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballPlayoffApiResponse,
      error: null,
    }));
  }

  async getFootballConfChamp(
    conference: string,
    season?: string,
  ): Promise<FootballConfChampApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football conf champ for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      `/football/conf_champ/${formattedConf}${seasonQuery}`,
      (data) => ({
        success: true,
        data: data as FootballConfChampApiResponse,
        error: null,
      }),
    );
  }

  async getFootballSeed(
    conference: string,
    season?: string,
  ): Promise<FootballSeedApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏈 Getting football seed for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      `/football_seed/${formattedConf}${seasonQuery}`,
      (data) => ({
        success: true,
        data: data as FootballSeedApiResponse,
        error: null,
      }),
    );
  }

  async getCFP(
    conference: string,
    season?: string,
  ): Promise<FootballCFPApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(`🏈 Getting CFP data for: ${sanitized} -> ${formattedConf}`);

    return this.request(`/cfp/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data as FootballCFPApiResponse,
      error: null,
    }));
  }

  async getFootballTeams(
    season?: string,
  ): Promise<FootballTeamsApiResponse> {
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log("🏈 API: About to call /football_teams");
    const result = await this.request(
      `/football_teams${seasonQuery}`,
      (data) => {
        console.log("🏈 API: Raw response data:", data);
        return {
          success: true,
          data: data as FootballTeamsApiResponse,
          error: null,
        };
      },
    );
    console.log("🏈 API: Final result:", result);
    return result;
  }

  async getFootballConfData(
    season?: string,
  ): Promise<FootballConferenceApiResponse> {
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(`🏈 Getting football conference data`);

    return this.request(`/football_conf_data${seasonQuery}`, (data) => ({
      success: true,
      data: data as FootballConferenceApiResponse,
      error: null,
    }));
  }

  async getFootballTeam(
    teamName: string,
    season?: string,
  ): Promise<FootballTeamDetailData> {
    const sanitizedTeamName = sanitizeInput(teamName);
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    const response = await fetch(
      `${API_BASE_URL}/football_team/${encodeURIComponent(sanitizedTeamName)}${seasonQuery}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch team data: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create singleton instance
export const api = new ApiClient();
