// src/services/football-api.ts
// Football-specific API methods and the combined ApiClient

import { sanitizeInput } from "@/lib/validation";
import {
  FootballCFPApiResponse,
  FootballConfChampApiResponse,
  FootballConferenceApiResponse,
  FootballCWVApiResponse,
  FootballScheduleResponse,
  FootballSeedApiResponse,
  FootballStandingsApiResponse,
  FootballTeamsApiResponse,
  FootballTWVApiResponse,
} from "@/types/football";
import { BasketballApiClient } from "./basketball-api";
import { logger } from "@/lib/logger";
import { apiPath, apiUrl } from "@/api/urls";

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


export class ApiClient extends BasketballApiClient {
  // Football API methods
  async getFootballStandings(
    conference: string,
    season?: string,
  ): Promise<FootballStandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    logger.debug(
      `🏈 Getting football standings for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      apiPath("football.standings", { conference: formattedConf }, { season }),
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
    logger.debug(
      `🏈 Getting football schedule for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      apiPath("football.confSchedule", { conference: formattedConf }, { season }),
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
  ): Promise<FootballTWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    logger.debug(
      `🏈 Getting football TWV for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(apiPath("football.twv", { conference: formattedConf }, { season }), (data) => ({
      success: true,
      data: data as FootballTWVApiResponse,
      error: null,
    }));
  }

  async getFootballCWV(
    conference: string,
    season?: string,
  ): Promise<FootballCWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    logger.debug(
      `🏈 Getting football CWV for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      apiPath("football.cwv", { conference: formattedConf }, { season }),
      (data) => ({
        success: true,
        data: data as FootballCWVApiResponse,
        error: null,
      }),
    );
  }

  async getFootballConfChamp(
    conference: string,
    season?: string,
  ): Promise<FootballConfChampApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    logger.debug(
      `🏈 Getting football conf champ for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      apiPath("football.confChamp", { conference: formattedConf }, { season }),
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
    logger.debug(
      `🏈 Getting football seed for: ${sanitized} -> ${formattedConf}`,
    );

    return this.request(
      apiPath("football.seed", { conference: formattedConf }, { season }),
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
    logger.debug(`🏈 Getting CFP data for: ${sanitized} -> ${formattedConf}`);

    return this.request(apiPath("football.cfp", { conference: formattedConf }, { season }), (data) => ({
      success: true,
      data: data as FootballCFPApiResponse,
      error: null,
    }));
  }

  async getFootballTeams(
    season?: string,
  ): Promise<FootballTeamsApiResponse> {
    logger.debug("🏈 API: About to call /football_teams");
    const result = await this.request(
      apiPath("football.teams", {}, { season }),
      (data) => {
        logger.debug("🏈 API: Raw response data:", data);
        return {
          success: true,
          data: data as FootballTeamsApiResponse,
          error: null,
        };
      },
    );
    logger.debug("🏈 API: Final result:", result);
    return result;
  }

  async getFootballConfData(
    season?: string,
  ): Promise<FootballConferenceApiResponse> {
    logger.debug(`🏈 Getting football conference data`);

    return this.request(apiPath("football.conferenceData", {}, { season }), (data) => ({
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
    const response = await fetch(
      apiUrl("football.team", { team: sanitizedTeamName }, { season }),
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch team data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Exports what-if scenarios as CSV text (the backend builds the file).
   * Throws with the backend's error message on failure.
   */
  async exportWhatIfCsv(request: {
    conference: string;
    selections: Array<{ game_id: number; winner_team_id: string | number }>;
    export_options: {
      include_all_scenarios: boolean;
      num_scenarios: number;
      start_scenario: number;
    };
  }): Promise<{ success?: boolean; csv_data?: string; filename: string; error?: string }> {
    const response = await fetch(apiUrl("football.whatIfExport"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }
    return data;
  }
}

// Create singleton instance
export const api = new ApiClient();
