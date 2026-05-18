import type {
  CWVApiResponse,
  ScheduleApiResponse,
  StandingsApiResponse,
} from "@/types/basketball";
import { z } from "zod";

// ============================================================================
// Basic Input Validation Schemas
// ============================================================================

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

// ============================================================================
// API Response Schemas (Zod Validation)
// ============================================================================

// Standing schema with flexible optional fields
const StandingSchema = z.object({
  team_name: z.string(),
  logo_url: z.string().url().or(z.string()),
  conference: z.string(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  total_scenarios: z.number().min(0),
  conference_record: z.string(),
  overall_record: z.string().optional(),
  conference_wins: z.number().min(0),
  conference_losses: z.number().min(0),
  record: z.string().optional(),
  avg_standing: z.number(),
  standings_distribution: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])),
  Conf_Standing_No_Ties_Avg: z.number().optional(),
  Standing_Dist_No_Ties: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])).optional(),
  avg_projected_conf_wins: z.number(),
  conf_wins_distribution: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])),
  wins_conf_percentiles: z.object({
    p5: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p95: z.number(),
  }),
  wins_conf_05: z.number().optional(),
  wins_conf_25: z.number().optional(),
  wins_conf_50: z.number().optional(),
  wins_conf_75: z.number().optional(),
  wins_conf_95: z.number().optional(),
  tournament_bid_pct: z.number().optional(),
  avg_seed: z.number().optional(),
  seed_distribution: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])).optional(),
  total_wins_distribution: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])).optional(),
  avg_projected_total_wins: z.number().optional(),
  wins_total_05: z.number().optional(),
  wins_total_25: z.number().optional(),
  wins_total_50: z.number().optional(),
  wins_total_75: z.number().optional(),
  wins_total_95: z.number().optional(),
  reg_wins_distribution: z.record(z.union([z.number(), z.string().pipe(z.coerce.number())])).optional(),
  avg_reg_season_wins: z.number().optional(),
  avg_kp40_reg_season_wins: z.number().optional(),
  reg_season_twv: z.number().optional(),
  wins_reg_05: z.number().optional(),
  wins_reg_25: z.number().optional(),
  wins_reg_50: z.number().optional(),
  wins_reg_75: z.number().optional(),
  wins_reg_95: z.number().optional(),
});

export const StandingsApiResponseSchema = z.object({
  data: z.array(StandingSchema),
  conferences: z.array(z.string()),
});

// CWV schemas
const CWVTeamSchema = z.object({
  team_name: z.string(),
  logo_url: z.string().url().or(z.string()),
  cwv: z.number(),
  current_record: z.string(),
  est_avg_record: z.string(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
});

const CWVGameSchema = z.object({
  rank: z.number().int().min(1),
  team: z.string(),
  win_prob: z.number().min(0).max(1),
  date: z.string().optional(),
  status: z.enum(["W", "L", "scheduled"]).optional(),
});

const CWVDataSchema = z.object({
  teams: z.array(CWVTeamSchema),
  games: z.array(CWVGameSchema),
});

export const CWVApiResponseSchema = z.object({
  data: CWVDataSchema,
  conferences: z.array(z.string()),
});

// Schedule schemas
const ScheduleDataSchema = z.object({
  Loc: z.string(),
  Team: z.string(),
  Win_Pct: z.string().optional(),
  Win_Pct_Raw: z.number().optional(),
  games: z.union([z.record(z.string(), z.string()), z.string()]),
});

const ScheduleSummarySchema = z.object({
  total_games: z.number().int().min(0),
  expected_wins: z.number().min(0),
  top_quartile: z.number().int().min(0),
  second_quartile: z.number().int().min(0),
  third_quartile: z.number().int().min(0),
  bottom_quartile: z.number().int().min(0),
});

export const ScheduleApiResponseSchema = z.object({
  data: z.array(ScheduleDataSchema),
  teams: z.array(z.string()),
  team_logos: z.record(z.string(), z.string()),
  summary: z.record(z.string(), ScheduleSummarySchema),
  conferences: z.array(z.string()),
});

// ============================================================================
// Validation Result Type
// ============================================================================

interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// ============================================================================
// Sanitization Helpers
// ============================================================================

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>"']/g, "");
}

export function validateConference(conference: string): boolean {
  try {
    if (conference === "All Teams" || conference === "All Tourney Teams") {
      return true;
    }
    ConferenceSchema.parse(conference);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// API Response Validators (Using Real Zod Schemas)
// ============================================================================

export function validateStandings(
  data: unknown,
): ValidationResult<StandingsApiResponse> {
  try {
    const parsed = StandingsApiResponseSchema.safeParse(data);

    if (parsed.success) {
      return {
        success: true,
        data: parsed.data as StandingsApiResponse,
        error: null,
      };
    }

    const errorMessage = parsed.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".")}: ${issue.message}`,
      )
      .join("; ");

    return {
      success: false,
      data: null,
      error: `Invalid standings data: ${errorMessage}`,
    };
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
    const parsed = CWVApiResponseSchema.safeParse(data);

    if (parsed.success) {
      return {
        success: true,
        data: parsed.data as CWVApiResponse,
        error: null,
      };
    }

    const errorMessage = parsed.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".")}: ${issue.message}`,
      )
      .join("; ");

    return {
      success: false,
      data: null,
      error: `Invalid CWV data: ${errorMessage}`,
    };
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
    const parsed = ScheduleApiResponseSchema.safeParse(data);

    if (parsed.success) {
      return {
        success: true,
        data: parsed.data as ScheduleApiResponse,
        error: null,
      };
    }

    const errorMessage = parsed.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".")}: ${issue.message}`,
      )
      .join("; ");

    return {
      success: false,
      data: null,
      error: `Invalid schedule data: ${errorMessage}`,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
