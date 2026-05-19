// src/services/basketball-api.ts
// Basketball-specific API methods

import { monitoring } from "@/lib/unified-monitoring";
import {
  sanitizeInput,
  validateConference,
  validateCWV,
  validateSchedule,
  validateStandings,
} from "@/lib/validation";
import {
  CWVApiResponse,
  NCAATeamApiResponse,
  ScheduleApiResponse,
  StandingsApiResponse,
} from "@/types/basketball";
import { BaseApiClient } from "./shared-request";

// Basketball-specific response interfaces
interface TWVApiResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    twv: number;
    actual_record: string;
    expected_record: string;
    rank: number;
  }>;
  conferences: string[];
}

interface ConfTourneyApiResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    conf_tourney_pct: number;
    conf_champion_pct: number;
  }>;
  conferences: string[];
}

interface SeedApiResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    ncaa_bid_pct?: number;
    tournament_bid_pct?: number;
    average_seed?: number;
    seed_distribution: Record<string, number>;
    first_four_out: number;
    next_four_out: number;
  }>;
  conferences: string[];
}

interface TeamDataApiResponse {
  team_info: {
    team_name: string;
    team_id: string;
    conference: string;
    logo_url: string;
    overall_record: string;
    conference_record: string;
  };
  schedule: Array<{
    date: string;
    opponent: string;
    location: string;
    status: string;
  }>;
}

interface UnifiedConferenceDataResponse {
  conferences: string[];
  data: Record<string, unknown>;
}

export class BasketballApiClient extends BaseApiClient {
  async getStandings(
    conference: string,
    season?: string,
  ): Promise<StandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏀 Getting standings for: ${sanitized} -> ${formattedConf}${seasonQuery}`,
    );

    monitoring.trackEvent({
      name: "standings_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(
      `/standings/${formattedConf}${seasonQuery}`,
      validateStandings,
    );
  }

  async getCWV(
    conference: string,
    season?: string,
  ): Promise<CWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(`🏀 Getting CWV for: ${sanitized} -> ${formattedConf}${seasonQuery}`);

    monitoring.trackEvent({
      name: "cwv_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(`/cwv/${formattedConf}${seasonQuery}`, validateCWV);
  }

  async getSchedule(
    conference: string,
    season?: string,
  ): Promise<ScheduleApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏀 Getting schedule for: ${sanitized} -> ${formattedConf}${seasonQuery}`,
    );

    monitoring.trackEvent({
      name: "schedule_requested",
      properties: { conference: formattedConf, season },
    });

    const rawResponse = await this.request(
      `/conf_schedule/${formattedConf}${seasonQuery}`,
      validateSchedule,
    );

    // Backend now returns teams, team_logos, and summary directly
    return rawResponse as ScheduleApiResponse;
  }

  async getTWV(
    conference: string,
    season?: string,
  ): Promise<TWVApiResponse> {
    const sanitized = sanitizeInput(conference);

    if (sanitized !== "All Teams" && !validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(`🏀 Getting TWV for: ${sanitized} -> ${formattedConf}${seasonQuery}`);

    monitoring.trackEvent({
      name: "twv_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(`/twv/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data as TWVApiResponse,
      error: null,
    }));
  }

  async getConfTourney(
    conference: string,
    season?: string,
  ): Promise<ConfTourneyApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏀 Getting conf tourney for: ${sanitized} -> ${formattedConf}${seasonQuery}`,
    );

    monitoring.trackEvent({
      name: "conf_tourney_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(`/conf_tourney/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data as ConfTourneyApiResponse,
      error: null,
    }));
  }

  async getNCAATourney(
    conference: string,
    season?: string,
  ): Promise<NCAATeamApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(
      `🏀 Getting NCAA tourney rounds for: ${sanitized} -> ${formattedConf}${seasonQuery}`,
    );

    monitoring.trackEvent({
      name: "ncaa_tourney_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(`/ncaa_tourney/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data as NCAATeamApiResponse,
      error: null,
    }));
  }

  async getSeedData(
    conference: string,
    season?: string,
  ): Promise<SeedApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : "";
    console.log(`🏀 Getting seed data for: ${sanitized} -> ${formattedConf}${seasonQuery}`);

    monitoring.trackEvent({
      name: "seed_requested",
      properties: { conference: formattedConf, season },
    });

    return this.request(`/seed/${formattedConf}${seasonQuery}`, (data) => ({
      success: true,
      data: data as SeedApiResponse,
      error: null,
    }));
  }

  async getTeamData(teamName: string): Promise<TeamDataApiResponse> {
    const encoded = encodeURIComponent(teamName);
    console.log(`🏀 Getting team data for: ${teamName} -> ${encoded}`);

    return this.request(`/team/${encoded}`, (data) => ({
      success: true,
      data: data as TeamDataApiResponse,
      error: null,
    }));
  }

  async getUnifiedConferenceData(): Promise<UnifiedConferenceDataResponse> {
    console.log(`🏀 Getting unified conference data`);

    return this.request(`/unified_conference_data`, (data) => ({
      success: true,
      data: data as UnifiedConferenceDataResponse,
      error: null,
    }));
  }
}
