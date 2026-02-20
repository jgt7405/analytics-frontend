import type {
  CWVApiResponse,
  ScheduleApiResponse,
  StandingsApiResponse,
} from "@/types/basketball";
import { z } from "zod";

// Basic validation schemas
export const ConferenceSchema = z
  .string()
  .min(1, "Conference is required")
  .max(50, "Conference name too long")
  .regex(/^[a-zA-Z0-9\s\-]+$/, "Invalid conference name");

export const TeamNameSchema = z
  .string()
  .min(1, "Team name is required")
  .max(100, "Team name too long")
  .regex(/^[a-zA-Z0-9\s\-&'().]+$/, "Invalid characters in team name");

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>"']/g, "");
}

export function validateConference(conference: string): boolean {
  try {
    // Allow special filter values
    if (conference === "All Teams" || conference === "All Tourney Teams") {
      return true;
    }
    ConferenceSchema.parse(conference);
    return true;
  } catch {
    return false;
  }
}

// Validation result type
interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Simple validation functions for API responses
export function validateStandings(
  data: unknown,
): ValidationResult<StandingsApiResponse> {
  try {
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "conferences" in data
    ) {
      return {
        success: true,
        data: data as StandingsApiResponse,
        error: null,
      };
    }
    throw new Error("Invalid standings data structure");
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

export function validateCWV(data: unknown): ValidationResult<CWVApiResponse> {
  try {
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "conferences" in data
    ) {
      return {
        success: true,
        data: data as CWVApiResponse,
        error: null,
      };
    }
    throw new Error("Invalid CWV data structure");
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

export function validateSchedule(
  data: unknown,
): ValidationResult<ScheduleApiResponse> {
  try {
    // Basketball API returns: { conferences: [], data: [] }
    // We'll transform it in api.ts to add teams, team_logos, summary
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "conferences" in data &&
      Array.isArray((data as Record<string, unknown>).data)
    ) {
      return {
        success: true,
        data: data as ScheduleApiResponse,
        error: null,
      };
    }

    throw new Error("Invalid schedule data structure");
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
