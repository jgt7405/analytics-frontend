# Win Values Over Time Chart Issue - Summary

## Overview
The "Win Values Over Time" charts were not displaying correctly on both basketball and football team pages (both archive and non-archive versions).

## Issues Found & Fixed

### Issue 1: Missing Season Parameter - Basketball Archive Pages ✅ FIXED
**Problem:** The basketball archive team pages were not passing the `season` prop to `BasketballTeamStandingsHistory` and `TeamWinValues` components.

**Files Modified:**
- `src/app/basketball/[season]/team/[teamname]/page.tsx`

**Changes:**
- Added `season={season}` to `BasketballTeamStandingsHistory` (mobile layout, line ~595)
- Added `season={season}` to `BasketballTeamStandingsHistory` (desktop layout, line ~962)
- Added `season={season}` to `TeamWinValues` (mobile layout, line ~461)
- Added `season={season}` to `TeamWinValues` (desktop layout, line ~903)

**Impact:** The Projected Standings History chart now loads data specific to the selected season instead of showing "Historical data coming soon" placeholder.

### Issue 2: Missing Season Parameter - Non-Archive Basketball Pages ✅ FIXED
**Problem:** The non-archive basketball team pages were not passing `currentSeason` to `TeamWinValues`.

**Files Modified:**
- `src/app/basketball/team/[teamname]/page.tsx`

**Changes:**
- Added `season={currentSeason}` to `TeamWinValues` (mobile layout, line ~486)
- Added `season={currentSeason}` to `TeamWinValues` (desktop layout, line ~928)

### Issue 3: Missing Season Parameter - Non-Archive Football Pages ✅ FIXED
**Problem:** The non-archive football team pages were not passing `currentSeason` to `FootballTeamWinValues`.

**Files Modified:**
- `src/app/football/team/[teamname]/page.tsx`

**Changes:**
- Added `season={currentSeason}` to `FootballTeamWinValues` (mobile layout, line ~426)
- Added `season={currentSeason}` to `FootballTeamWinValues` (desktop layout, line ~781)

### Issue 4: Chart Date Range Extending Past Season End ✅ FIXED
**Problem:** The Win Values Over Time charts were extending beyond the season end date (3/15 for basketball, 12/15 for football) to today's date.

**Files Modified:**
- `src/components/features/basketball/TeamWinValues.tsx`
- `src/components/features/football/FootballTeamWinValues.tsx`

**Changes:**
- Updated logic to use `range.end` (from `getBasketballDateRange`/`getFootballDateRange`) instead of current date
- Basketball: Now stops at 3/15 (season ends)
- Football: Now stops at 12/15 (season ends)

### Issue 5: Football Schedule Missing TWV/CWV Data ❌ NOT FIXED (Backend Issue)
**Problem:** The football schedule API endpoint returns `null` for all `twv` and `cwv` values, causing the chart to show a flat line at 0.

**Root Cause:** The backend API (`/football_team/{teamName}?season={season}`) does not calculate or populate TWV/CWV values for football games.

**Evidence:** 
API Response for Arizona football:
```json
{
  "schedule": [
    {
      "date": "09/05",
      "opponent": "Northern Arizona",
      "twv": null,
      "cwv": null,
      ...
    }
  ]
}
```

All games have `null` for both `twv` and `cwv` fields.

**Basketball Comparison:** Basketball API populates these values correctly, which is why the basketball chart works.

## Current Status

### ✅ Working
- Basketball Win Values Over Time (archive pages)
- Basketball Win Values Over Time (non-archive pages)
- Basketball Projected Standings History (archive pages)
- Football Win Values Over Time chart displays with correct date range (8/15 - 12/15)

### ❌ Not Working
- Football Win Values Over Time shows flat line at 0 (no data)

## Required Backend Changes

To fix the football Win Values chart, the backend needs to:

1. Calculate `twv` (True Win Value) for each football game
2. Calculate `cwv` (Conference Win Value) for each football game
3. Return these values in the schedule array of the `/football_team/{teamName}?season={season}` endpoint

**Expected Format:**
```json
{
  "schedule": [
    {
      "date": "09/05",
      "opponent": "Northern Arizona",
      "twv": 0.5,      // Currently: null
      "cwv": 0.3,      // Currently: null
      ...
    }
  ]
}
```

## Workarounds (Frontend Only)

If backend changes are not immediately available, the chart could use `team_win_prob` as a proxy for TWV to show game-by-game win probabilities instead of win values.

## Next Steps

1. **Contact backend team** to implement TWV/CWV calculations for football games
2. **Monitor** football schedule API responses to confirm data is populated
3. **Test** all four chart types (basketball archive, basketball non-archive, football archive, football non-archive) once backend changes are deployed
