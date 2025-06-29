// src/services/api.ts
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
  ScheduleApiResponse,
  StandingsApiResponse,
} from "@/types/basketball";
import { ApiError, BasketballApiError } from "@/types/errors";
import {
  FootballCFPApiResponse,
  FootballConferenceApiResponse,
  FootballCWVApiResponse,
  FootballPlayoffApiResponse,
  FootballSeedApiResponse,
  FootballStandingsApiResponse,
  FootballTeamApiResponse,
  FootballTeamsApiResponse,
  FootballTWVApiResponse,
} from "@/types/football";

const API_BASE_URL = "/api/proxy";

// Define specific API response types
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

interface NCAATourneyApiResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    ncaa_bid_pct: number;
    seed_distribution: Record<string, number>;
  }>;
  conferences: string[];
}

interface SeedApiResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    ncaa_bid_pct: number;
    average_seed: number;
    seed_distribution: Record<string, number>;
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

interface HealthCheckResponse {
  status: string;
  timestamp: number;
}

class ApiClient {
  private createUserFriendlyError(
    error: unknown,
    endpoint: string
  ): BasketballApiError {
    let apiError: ApiError;

    if (error instanceof Error && error.name === "AbortError") {
      apiError = {
        type: "network",
        message: `Request timeout for ${endpoint}`,
        userMessage: "Request timed out. Please try again.",
        retryable: true,
      };
    } else if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      apiError = {
        type: "not_found",
        message: `Conference data not found: ${endpoint}`,
        userMessage:
          "Conference data not available. Try selecting a different conference.",
        status: 404,
        retryable: false,
      };
    } else if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number" &&
      error.status >= 500
    ) {
      apiError = {
        type: "server",
        message: `Server error: ${error instanceof Error ? error.message : "Unknown server error"}`,
        userMessage:
          "Our servers are experiencing issues. Please try again in a few minutes.",
        status: error.status,
        retryable: true,
      };
    } else if (
      error instanceof Error &&
      error.message?.includes("Validation failed")
    ) {
      apiError = {
        type: "validation",
        message: `Data validation failed: ${error.message}`,
        userMessage: "Received invalid data from server. Please try again.",
        retryable: true,
      };
    } else {
      apiError = {
        type: "network",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage:
          "Unable to load data. Please check your connection and try again.",
        retryable: true,
      };
    }

    monitoring.trackError(
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint,
        apiErrorType: apiError.type,
        retryable: apiError.retryable,
      }
    );

    return new BasketballApiError(
      apiError,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  private async request<T>(
    endpoint: string,
    validator: (data: unknown) => {
      success: boolean;
      data: T | null;
      error: unknown;
    },
    retries = 3
  ): Promise<T> {
    const startTime = Date.now();

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "public, max-age=300", // 5 minutes
          },
          signal: AbortSignal.timeout(15000), // Increased timeout
        });

        const duration = Date.now() - startTime;

        monitoring.trackApiCall(endpoint, "GET", duration, response.status);

        if (!response.ok) {
          throw Object.assign(new Error(`HTTP ${response.status}`), {
            status: response.status,
            statusText: response.statusText,
          });
        }

        const rawData = await response.json();
        const validation = validator(rawData);

        if (!validation.success) {
          console.error("API validation failed:", validation.error);
          throw new Error(
            `Validation failed: ${JSON.stringify(validation.error)}`
          );
        }

        return validation.data!;
      } catch (error) {
        if (i === retries - 1) {
          throw this.createUserFriendlyError(error, endpoint);
        }

        monitoring.trackEvent({
          name: "api_retry",
          properties: {
            endpoint,
            attempt: i + 1,
            error: (error as Error).message,
          },
        });

        const backoffTime = Math.min(Math.pow(2, i) * 1000, 5000);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }
    throw new Error("Max retries exceeded");
  }

  // Basketball API methods
  async getStandings(conference: string): Promise<StandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "standings_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/standings/${formattedConf}`, validateStandings);
  }

  async getCWV(conference: string): Promise<CWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "cwv_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/cwv/${formattedConf}`, validateCWV);
  }

  async getSchedule(conference: string): Promise<ScheduleApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "schedule_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/conf_schedule/${formattedConf}`, validateSchedule);
  }

  async getTWV(conference: string): Promise<TWVApiResponse> {
    const sanitized = sanitizeInput(conference);

    // Allow "All Teams" as a special case
    if (sanitized !== "All Teams" && !validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    // Format conference for API call
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "twv_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/twv/${formattedConf}`, (data) => ({
      success: true,
      data: data as TWVApiResponse,
      error: null,
    }));
  }

  async getConfTourney(conference: string): Promise<ConfTourneyApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "conf_tourney_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/conf_tourney/${formattedConf}`, (data) => ({
      success: true,
      data: data as ConfTourneyApiResponse,
      error: null,
    }));
  }

  async getNCAATourney(conference: string): Promise<NCAATourneyApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "ncaa_tourney_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/ncaa_tourney/${formattedConf}`, (data) => ({
      success: true,
      data: data as NCAATourneyApiResponse,
      error: null,
    }));
  }

  async getSeedData(conference: string): Promise<SeedApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "seed_requested",
      properties: { conference: formattedConf },
    });

    return this.request(`/seed/${formattedConf}`, (data) => ({
      success: true,
      data: data as SeedApiResponse,
      error: null,
    }));
  }

  async getTeamData(teamName: string): Promise<TeamDataApiResponse> {
    const sanitized = sanitizeInput(teamName);
    if (!sanitized) {
      throw new Error("Invalid team name");
    }

    const encodedTeamName = encodeURIComponent(sanitized);

    monitoring.trackEvent({
      name: "team_data_requested",
      properties: { team: sanitized },
    });

    return this.request(`/team/${encodedTeamName}`, (data) => ({
      success: true,
      data: data as TeamDataApiResponse,
      error: null,
    }));
  }

  async getUnifiedConferenceData(): Promise<UnifiedConferenceDataResponse> {
    monitoring.trackEvent({
      name: "unified_conference_data_requested",
      properties: {},
    });

    return this.request(`/unified_conference_data`, (data) => ({
      success: true,
      data: data as UnifiedConferenceDataResponse,
      error: null,
    }));
  }

  // Football API methods
  async getFootballStandings(
    conference: string
  ): Promise<FootballStandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference parameter");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "football_standings_requested",
      properties: { conference: formattedConf },
    });

    const data = await this.get<FootballStandingsApiResponse>(
      `/football/standings/${encodeURIComponent(formattedConf)}`
    );

    const validation = validateStandings(data);
    if (!validation.success) {
      throw new Error(validation.error || "Invalid football standings data");
    }

    return validation.data;
  }

  async getFootballTWV(conference: string): Promise<FootballTWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference parameter");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "football_twv_requested",
      properties: { conference: formattedConf },
    });

    return this.get<FootballTWVApiResponse>(
      `/football/twv/${encodeURIComponent(formattedConf)}`
    );
  }

  async getFootballCWV(conference: string): Promise<FootballCWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference parameter");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "football_cwv_requested",
      properties: { conference: formattedConf },
    });

    return this.get<FootballCWVApiResponse>(
      `/football/cwv/${encodeURIComponent(formattedConf)}`
    );
  }

  async getFootballPlayoffs(
    conference: string
  ): Promise<FootballPlayoffApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference parameter");
    }

    const formattedConf = sanitized.replace(/ /g, "_");

    monitoring.trackEvent({
      name: "football_playoffs_requested",
      properties: { conference: formattedConf },
    });

    return this.get<FootballPlayoffApiResponse>(
      `/football/playoffs/${encodeURIComponent(formattedConf)}`
    );
  }

  async getCFP(conference: string): Promise<FootballCFPApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");

    return this.request(`/cfp/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballCFPApiResponse,
      error: null,
    }));
  }

  async getFootballSeed(conference: string): Promise<FootballSeedApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");

    return this.request(`/football_seed/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballSeedApiResponse,
      error: null,
    }));
  }

  async getFootballConfData(): Promise<FootballConferenceApiResponse> {
    return this.request(`/football/conf-data`, (data) => ({
      success: true,
      data: data as FootballConferenceApiResponse,
      error: null,
    }));
  }

  async getFootballTeams(): Promise<FootballTeamsApiResponse> {
    console.log("🏈 API: About to call /football_teams");
    const result = await this.request(`/football_teams`, (data) => {
      console.log("🏈 API: Raw response data:", data);
      return {
        success: true,
        data: data as FootballTeamsApiResponse,
        error: null,
      };
    });
    console.log("🏈 API: Final result:", result);
    return result;
  }

  async getFootballTeam(teamName: string): Promise<FootballTeamApiResponse> {
    const encoded = encodeURIComponent(teamName);
    return this.request(`/football_team/${encoded}`, (data) => ({
      success: true,
      data: data as FootballTeamApiResponse,
      error: null,
    }));
  }

  // Health check endpoint
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        status: data.status || "ok",
        timestamp: Date.now(),
      };
    } catch (error) {
      monitoring.trackError(error as Error, {
        endpoint: "/health",
        operation: "health_check",
      });

      return {
        status: "error",
        timestamp: Date.now(),
      };
    }
  }

  // Generic GET request for any endpoint
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      const duration = Date.now() - startTime;
      monitoring.trackApiCall(endpoint, "GET", duration, response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      monitoring.trackError(error as Error, {
        endpoint,
        operation: "generic_get",
      });
      throw this.createUserFriendlyError(error, endpoint);
    }
  }

  // Generic POST request
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      const duration = Date.now() - startTime;
      monitoring.trackApiCall(endpoint, "POST", duration, response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      monitoring.trackError(error as Error, {
        endpoint,
        operation: "generic_post",
      });
      throw this.createUserFriendlyError(error, endpoint);
    }
  }
}

export const api = new ApiClient();

// Basketball API exports for backward compatibility
export const getStandings = (conference: string) =>
  api.getStandings(conference);
export const getCWV = (conference: string) => api.getCWV(conference);
export const getSchedule = (conference: string) => api.getSchedule(conference);
export const getTWV = (conference: string) => api.getTWV(conference);
export const getConfTourney = (conference: string) =>
  api.getConfTourney(conference);
export const getNCAATourney = (conference: string) =>
  api.getNCAATourney(conference);
export const getSeedData = (conference: string) => api.getSeedData(conference);
export const getTeamData = (teamName: string) => api.getTeamData(teamName);
export const getUnifiedConferenceData = () => api.getUnifiedConferenceData();

// Football API exports
export const getFootballStandings = (conference: string) =>
  api.getFootballStandings(conference);
export const getFootballTWV = (conference: string) =>
  api.getFootballTWV(conference);
export const getFootballCWV = (conference: string) =>
  api.getFootballCWV(conference);
export const getFootballPlayoffs = (conference: string) =>
  api.getFootballPlayoffs(conference);

// Legacy function names for compatibility
export const getConfScheduleData = (conference: string) =>
  api.getSchedule(conference);
export const getStandingsData = (conference: string) =>
  api.getStandings(conference);
export const getCWVData = (conference: string) => api.getCWV(conference);
