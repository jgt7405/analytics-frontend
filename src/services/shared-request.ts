// src/services/shared-request.ts
// Shared HTTP infrastructure for all API clients (basketball, football)

import { monitoring } from "@/lib/unified-monitoring";
import { ApiError, BasketballApiError } from "@/types/errors";

const API_BASE_URL = "/api/proxy";

interface HealthCheckResponse {
  status: string;
  timestamp: number;
}

// Endpoint validation lists
const BASKETBALL_ENDPOINTS = [
  "/standings/",
  "/cwv/",
  "/conf_schedule/",
  "/twv/",
  "/conf_tourney/",
  "/seed/",
  "/ncaa_tourney/",
  "/team/",
  "/unified_conference_data",
  "/basketball_teams",
  "/basketball/upcoming_games",
];

const FOOTBALL_ENDPOINTS = [
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
];

const ALL_VALID_ENDPOINTS = [
  ...BASKETBALL_ENDPOINTS,
  ...FOOTBALL_ENDPOINTS,
  "/health",
];

export class BaseApiClient {
  protected createUserFriendlyError(
    error: unknown,
    endpoint: string,
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
      },
    );

    return new BasketballApiError(
      apiError,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  protected validateEndpoint(endpoint: string): boolean {
    return ALL_VALID_ENDPOINTS.some(
      (valid) => endpoint.startsWith(valid) || endpoint === valid,
    );
  }

  protected async request<T>(
    endpoint: string,
    validator: (data: unknown) => {
      success: boolean;
      data: T | null;
      error: unknown;
    },
    retries = 3,
  ): Promise<T> {
    if (!this.validateEndpoint(endpoint)) {
      console.warn(`⚠️  Potentially invalid endpoint: ${endpoint}`);
    }

    const startTime = Date.now();
    const fullUrl = `${API_BASE_URL}${endpoint}`;

    console.log(`📄 Making API call to: ${fullUrl}`);

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(fullUrl, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "public, max-age=300",
          },
          signal: AbortSignal.timeout(15000),
        });

        const duration = Date.now() - startTime;
        monitoring.trackApiCall(endpoint, "GET", duration, response.status);

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
            },
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
            `Validation failed: ${JSON.stringify(validation.error)}`,
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

  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      status: data.status || "unknown",
      timestamp: Date.now(),
    };
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        fullUrl.searchParams.append(key, value);
      });
    }

    const response = await fetch(fullUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw Object.assign(
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        {
          status: response.status,
          statusText: response.statusText,
        },
      );
    }

    const duration = Date.now();
    monitoring.trackApiCall(endpoint, "GET", duration, response.status);

    return response.json();
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const startTime = Date.now();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - startTime;
    monitoring.trackApiCall(endpoint, "POST", duration, response.status);

    if (!response.ok) {
      throw Object.assign(
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        {
          status: response.status,
          statusText: response.statusText,
        },
      );
    }

    return response.json();
  }
}
