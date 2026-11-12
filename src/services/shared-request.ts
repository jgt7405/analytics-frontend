// src/services/shared-request.ts
// Shared HTTP infrastructure for all API clients (basketball, football)

import { monitoring } from "@/lib/unified-monitoring";
import { ApiError, BasketballApiError } from "@/types/errors";
import { proxyUrl } from "@/lib/proxy-url";
import { logger } from "@/lib/logger";
import { matchEndpoint } from "@/api/endpoints";


export class BaseApiClient {
  protected createUserFriendlyError(
    error: unknown,
    endpoint: string,
  ): BasketballApiError {
    let apiError: ApiError;

    logger.error(`API Error Details:`, {
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

    // Keep the HTTP status on every error (400, 429, ...) so React Query's
    // retry rule can tell a client error from an outage.
    if (
      apiError.status === undefined &&
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      apiError.status = error.status;
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

  // The proxy only forwards endpoints registered in src/api/endpoints.ts;
  // flag an unregistered one here too, so the cause is visible in the
  // browser console rather than only as a 404 or 400.
  protected validateEndpoint(endpoint: string): boolean {
    const path = endpoint.split("?")[0].replace(/^\/+|\/+$/g, "");
    const segments = path.split("/").map((s) => decodeURIComponent(s));
    return matchEndpoint("GET", segments).kind === "ok";
  }

  protected async request<T>(
    endpoint: string,
    validator: (data: unknown) => {
      success: boolean;
      data: T | null;
      error: unknown;
    },
  ): Promise<T> {
    if (!this.validateEndpoint(endpoint)) {
      logger.warn(`Unregistered endpoint (src/api/endpoints.ts): ${endpoint}`);
    }

    const startTime = Date.now();
    const fullUrl = proxyUrl(endpoint);

    logger.debug(`📄 Making API call to: ${fullUrl}`);

    // One attempt only. Retrying is React Query's job (QueryProvider): a
    // second retry loop here multiplied every failure, up to 12 requests per
    // query, just when the backend was already struggling.
    try {
      const response = await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: AbortSignal.timeout(15000),
      });

      const duration = Date.now() - startTime;
      monitoring.trackApiCall(endpoint, "GET", duration, response.status);

      if (!response.ok) {
        throw Object.assign(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          {
            status: response.status,
            statusText: response.statusText,
          },
        );
      }

      const rawData = await response.json();
      logger.debug(`✅ API Success for ${endpoint}:`, {
        status: response.status,
        dataKeys: Object.keys(rawData || {}),
      });

      const validation = validator(rawData);

      if (!validation.success) {
        logger.error("❌ API validation failed:", validation.error);
        throw new Error(
          `Validation failed: ${JSON.stringify(validation.error)}`,
        );
      }

      return validation.data!;
    } catch (error) {
      throw this.createUserFriendlyError(error, endpoint);
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = new URL(proxyUrl(endpoint), window.location.origin);

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
    const fullUrl = proxyUrl(endpoint);
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
