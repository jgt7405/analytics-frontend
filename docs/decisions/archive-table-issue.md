# Archive Table Issue Summary

## Problem
The `/football/conf_schedule/<conference_name>` endpoint does **NOT** implement season/archive table handling, while other similar endpoints do.

## Current Behavior
```python
@api.route('/football/conf_schedule/<string:conference_name>', methods=['GET'])
def get_football_conf_schedule(conference_name):
    try:
        db = DatabaseManager()

        # ❌ NO SEASON PARAMETER EXTRACTION
        # ❌ ALWAYS queries current tables
        difficulty_query = "SELECT * FROM football_conf_difficulty WHERE conf = %s"
        difficulty_df = db.query_to_dataframe(difficulty_query, (conference_name.replace('_', ' '),))

        schedule_query = "SELECT * FROM football_team_schedule WHERE conf = %s"
        schedule_df = db.query_to_dataframe(schedule_query, (conference_name.replace('_', ' '),))
```

**Issues:**
- ❌ Missing `season = request.args.get('season')` parameter
- ❌ No conditional logic for current vs. archive tables
- ❌ Cannot retrieve historical season data

## Correct Pattern (Used Elsewhere)

### Example: `/football/standings/<conference_name>` (Line ~2800)
```python
season = request.args.get('season')

if season:
    # Archive mode: filter by season and final = 'Y'
    season_filter = f"season = '{season}' AND final = 'Y'"
else:
    # Current mode: filter by is_current = TRUE
    season_filter = "is_current = TRUE"
```

### Example: Basketball routes also follow this pattern
```python
if season:
    query = "SELECT * FROM bball_team_schedule_archive WHERE conf = %s AND season = %s"
    df = db.query_to_dataframe(query, (conference_name, season))
else:
    query = "SELECT * FROM bball_team_schedule WHERE conf = %s"
    df = db.query_to_dataframe(query, (conference_name,))
```

## Required Fix

### Current Tables
- `football_conf_difficulty`
- `football_team_schedule`

### Archive Tables
- `football_conf_difficulty_archive` (with `season` column)
- `football_team_schedule_archive` (with `season` column)

### Implementation
```python
@api.route('/football/conf_schedule/<string:conference_name>', methods=['GET'])
def get_football_conf_schedule(conference_name):
    try:
        db = DatabaseManager()

        # ✅ GET SEASON PARAMETER
        season = request.args.get('season')

        # ✅ CONDITIONAL TABLE SELECTION
        if season:
            difficulty_query = "SELECT * FROM football_conf_difficulty_archive WHERE conf = %s AND season = %s"
            difficulty_df = db.query_to_dataframe(difficulty_query, (conference_name.replace('_', ' '), season))

            schedule_query = "SELECT * FROM football_team_schedule_archive WHERE conf = %s AND season = %s"
            schedule_df = db.query_to_dataframe(schedule_query, (conference_name.replace('_', ' '), season))
        else:
            difficulty_query = "SELECT * FROM football_conf_difficulty WHERE conf = %s"
            difficulty_df = db.query_to_dataframe(difficulty_query, (conference_name.replace('_', ' '),))

            schedule_query = "SELECT * FROM football_team_schedule WHERE conf = %s"
            schedule_df = db.query_to_dataframe(schedule_query, (conference_name.replace('_', ' '),))

        # ... rest of function remains the same
```

## Impact
- **Affected Endpoint:** `/football/conf_schedule/<conference_name>`
- **Severity:** High - Cannot access historical season data
- **Related Working Endpoints:** 
  - `/football/standings/<conference_name>` ✅
  - `/basketball/standings/<conference_name>` ✅
  - `/football/conf_champ/<conference_name>` ✅
  - And many others...

## Notes
- The pattern is consistent across 30+ endpoints in the codebase
- This is the ONLY football schedule endpoint missing this implementation
- Should be a straightforward fix following the established pattern
