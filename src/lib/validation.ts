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
  return input.trim().replace(/[<>\"']/g, "");
}

export function validateConference(conference: string): boolean {
  try {
    // Allow "All Teams" as a special case
    if (conference === "All Teams") {
      return true;
    }
    ConferenceSchema.parse(conference);
    return true;
  } catch {
    return false;
  }
}

// Simple validation functions for API responses
export function validateStandings(data: unknown) {
  try {
    // Basic validation - just check if it has the expected structure
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "conferences" in data
    ) {
      return {
        success: true,
        data: data as any,
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

export function validateCWV(data: unknown) {
  try {
    // Basic validation - just check if it has the expected structure
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "conferences" in data
    ) {
      return {
        success: true,
        data: data as any,
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

export function validateSchedule(data: unknown) {
  try {
    if (
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      "teams" in data &&
      "conferences" in data
    ) {
      return { success: true, data: data as any, error: null };
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
