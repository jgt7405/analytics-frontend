// src/services/api.ts
// Re-exports from domain-specific API modules for backward compatibility
// Original 937-line monolithic file has been split into:
//   - shared-request.ts (infrastructure)
//   - basketball-api.ts (basketball methods)
//   - football-api.ts (football methods + combined ApiClient)

export { ApiClient, api } from "./football-api";

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
export const getFootballStandings = (conference: string, season?: string) =>
  api.getFootballStandings(conference, season);
export const getFootballTWV = (conference: string, season?: string) =>
  api.getFootballTWV(conference, season);
export const getFootballCWV = (conference: string, season?: string) =>
  api.getFootballCWV(conference, season);
export const getFootballPlayoffs = (conference: string) =>
  api.getFootballPlayoffs(conference);
export const getFootballCFP = (conference: string, season?: string) =>
  api.getCFP(conference, season);

// Legacy function names for compatibility
export const getConfScheduleData = (conference: string) =>
  api.getSchedule(conference);
export const getStandingsData = (conference: string) =>
  api.getStandings(conference);
export const getCWVData = (conference: string) => api.getCWV(conference);

// Import api for use in the standalone exports above
import { api } from "./football-api";
