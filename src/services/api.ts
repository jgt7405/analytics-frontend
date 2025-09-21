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
  FootballScheduleResponse,
  FootballSeedApiResponse,
  FootballStandingsApiResponse,
  FootballTeamsApiResponse,
  FootballTWVApiResponse,
} from "@/types/football";

const API_BASE_URL = "/api/proxy";

// Add this interface near the top of your api.ts file, around line 30-80 with the other interfaces

interface FootballTeamData {
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

// **NEW: NCAA Tournament Round Progression Response Type**
interface NCAATeamResponse {
  data: Array<{
    team_name: string;
    team_id: string;
    logo_url: string;
    NCAA_Champion: number;
    NCAA_Championship: number;
    NCAA_Final_Four: number;
    NCAA_Elite_Eight: number;
    NCAA_Sweet_Sixteen: number;
    NCAA_Second_Round: number;
    NCAA_First_Round: number;
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
  // **FIXED: Consolidated error handling method**
  private createUserFriendlyError(
    error: unknown,
    endpoint: string
  ): BasketballApiError {
    let apiError: ApiError;

    console.error(`API Error Details:`, {
      error,
      endpoint,
      errorType: typeof error,
      errorStatus:
        error && typeof error === "object" && "status" in error
          ? error.status
          : "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

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
        message: `Endpoint not found: ${endpoint}`,
        userMessage:
          "The requested data is not available. Please try selecting a different conference or check if the endpoint exists.",
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

  // **FIXED: Added endpoint validation with NCAA tournament endpoint**
  private validateEndpoint(endpoint: string): boolean {
    const validEndpoints = [
      "/standings/",
      "/cwv/",
      "/conf_schedule/",
      "/twv/",
      "/conf_tourney/",
      "/seed/",
      "/ncaa_tourney/",
      "/team/", // ← Added /ncaa_tourney/
      "/unified_conference_data",
      "/basketball_teams",
      "/football_teams",
      "/football_conf_data",
      "/football/standings/",
      "/football/cwv/",
      "/football/conf_schedule/",
      "/football/twv/",
      "/football/conf_champ/",
      "/football_seed/",
      "/cfp/",
      "/football_team/",
      "/health",
    ];

    return validEndpoints.some(
      (valid) => endpoint.startsWith(valid) || endpoint === valid
    );
  }

  // **FIXED: Enhanced request method with better error handling**
  private async request<T>(
    endpoint: string,
    validator: (data: unknown) => {
      success: boolean;
      data: T | null;
      error: unknown;
    },
    retries = 3
  ): Promise<T> {
    // **NEW: Validate endpoint before making request**
    if (!this.validateEndpoint(endpoint)) {
      console.warn(`⚠️  Potentially invalid endpoint: ${endpoint}`);
    }

    const startTime = Date.now();
    const fullUrl = `${API_BASE_URL}${endpoint}`;

    console.log(`🔄 Making API call to: ${fullUrl}`);

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(fullUrl, {
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

        // **FIXED: Enhanced error logging**
        if (!response.ok) {
          console.error(`❌ API Error Details:`, {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            endpoint: endpoint,
            fullUrl: fullUrl,
            attempt: i + 1,
            maxRetries: retries,
          });

          throw Object.assign(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
            {
              status: response.status,
              statusText: response.statusText,
            }
          );
        }

        const rawData = await response.json();
        console.log(`✅ API Success for ${endpoint}:`, {
          status: response.status,
          dataKeys: Object.keys(rawData || {}),
        });

        const validation = validator(rawData);

        if (!validation.success) {
          console.error("❌ API validation failed:", validation.error);
          throw new Error(
            `Validation failed: ${JSON.stringify(validation.error)}`
          );
        }

        return validation.data!;
      } catch (error) {
        console.error(`❌ API Request failed (attempt ${i + 1}/${retries}):`, {
          endpoint,
          error: error instanceof Error ? error.message : String(error),
          fullUrl,
        });

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
    console.log(`🏀 Getting standings for: ${sanitized} -> ${formattedConf}`);

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
    console.log(`🏀 Getting CWV for: ${sanitized} -> ${formattedConf}`);

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
    console.log(`🏀 Getting schedule for: ${sanitized} -> ${formattedConf}`);

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
    console.log(`🏀 Getting TWV for: ${sanitized} -> ${formattedConf}`);

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
    console.log(
      `🏀 Getting conf tourney for: ${sanitized} -> ${formattedConf}`
    );

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

  // **FIXED: NCAA Tournament method - now uses correct endpoint for round progression data**
  async getNCAATourney(conference: string): Promise<NCAATeamResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    console.log(
      `🏀 Getting NCAA tourney rounds for: ${sanitized} -> ${formattedConf}`
    );

    monitoring.trackEvent({
      name: "ncaa_tourney_requested",
      properties: { conference: formattedConf },
    });

    // **FIXED: Use /ncaa_tourney/ endpoint for round progression data**
    return this.request(`/ncaa_tourney/${formattedConf}`, (data) => ({
      success: true,
      data: data as NCAATeamResponse,
      error: null,
    }));
  }

  // **FIXED: Seed data method - uses /seed/ endpoint for seed distribution data**
  async getSeedData(conference: string): Promise<SeedApiResponse> {
    const sanitized = sanitizeInput(conference);
    if (!validateConference(sanitized)) {
      throw new Error("Invalid conference name");
    }

    const formattedConf = sanitized.replace(/ /g, "_");
    console.log(`🏀 Getting seed data for: ${sanitized} -> ${formattedConf}`);

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

  // Football API methods
  async getFootballStandings(
    conference: string
  ): Promise<FootballStandingsApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football standings for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football/standings/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballStandingsApiResponse,
      error: null,
    }));
  }

  async getFootballSchedule(
    conference: string
  ): Promise<FootballScheduleResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football schedule for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football/conf_schedule/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballScheduleResponse,
      error: null,
    }));
  }

  async getFootballTWV(conference: string): Promise<FootballTWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football TWV for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football/twv/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballTWVApiResponse,
      error: null,
    }));
  }

  async getFootballCWV(conference: string): Promise<FootballCWVApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf = sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football CWV for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football/cwv/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballCWVApiResponse,
      error: null,
    }));
  }

  // **FIXED: Football Playoffs method - returns correct type**
  async getFootballPlayoffs(
    conference: string
  ): Promise<FootballPlayoffApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    console.log(
      `🏈 Getting football playoffs for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football/playoffs/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballPlayoffApiResponse,
      error: null,
    }));
  }

  // **FIXED: Separate CFP method for College Football Playoff data**
  async getCFP(conference: string): Promise<FootballCFPApiResponse> {
    const sanitized = sanitizeInput(conference);
    const formattedConf =
      sanitized === "All Teams" ? "All_Teams" : sanitized.replace(/ /g, "_");
    console.log(`🏈 Getting CFP data for: ${sanitized} -> ${formattedConf}`);

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
    console.log(
      `🏈 Getting football seed for: ${sanitized} -> ${formattedConf}`
    );

    return this.request(`/football_seed/${formattedConf}`, (data) => ({
      success: true,
      data: data as FootballSeedApiResponse,
      error: null,
    }));
  }

  async getFootballConfData(): Promise<FootballConferenceApiResponse> {
    console.log(`🏈 Getting football conference data`);

    return this.request(`/football_conf_data`, (data) => ({
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

  async getFootballTeam(teamName: string): Promise<FootballTeamData> {
    const sanitizedTeamName = sanitizeInput(teamName);
    const response = await fetch(
      `${API_BASE_URL}/football_team/${encodeURIComponent(sanitizedTeamName)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch team data: ${response.statusText}`);
    }

    return response.json();
  }

  // Health check endpoint
  async healthCheck(): Promise<HealthCheckResponse> {
    console.log("🏥 Performing health check");

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
      console.error("❌ Health check failed:", error);
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

  // **FIXED: Enhanced generic GET request**
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    console.log(`🔄 Generic GET request to: ${url}`);
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
        console.error(`❌ Generic GET Error:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          endpoint: endpoint,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Generic GET Success for ${endpoint}:`, {
        status: response.status,
      });
      return data as T;
    } catch (error) {
      console.error(`❌ Generic GET failed:`, {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
      monitoring.trackError(error as Error, {
        endpoint,
        operation: "generic_get",
      });
      throw this.createUserFriendlyError(error, endpoint);
    }
  }

  // **FIXED: Enhanced generic POST request**
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    console.log(`🔄 Generic POST request to: ${API_BASE_URL}${endpoint}`);
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
        console.error(`❌ Generic POST Error:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          endpoint: endpoint,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Generic POST Success for ${endpoint}:`, {
        status: response.status,
      });
      return data as T;
    } catch (error) {
      console.error(`❌ Generic POST failed:`, {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
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
export const getFootballCFP = (conference: string) => api.getCFP(conference); // **NEW: Added CFP export**

// Legacy function names for compatibility
export const getConfScheduleData = (conference: string) =>
  api.getSchedule(conference);
export const getStandingsData = (conference: string) =>
  api.getStandings(conference);
export const getCWVData = (conference: string) => api.getCWV(conference);
