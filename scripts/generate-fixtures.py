#!/usr/bin/env python3
"""Regenerate fixtures/backend/*.json from the Flask backend's own route code.

The "normal" fixtures are real backend responses: each route runs against
the small fake database in the backend's tests (jthom_prod_backend
conftest.py, tables with the production column names), so their shape is
exactly what the routes return. Scenario variants (empty conference, missing
fields, preseason, archived season) are derived from them in
fixtures/backend/index.ts.

Usage, from this repo, with the backend checked out next to it:
    pip install -r ../jthom_prod_backend/requirements.txt
    python scripts/generate-fixtures.py ../jthom_prod_backend
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

backend = Path(sys.argv[1] if len(sys.argv) > 1 else "../jthom_prod_backend").resolve()
out = Path(__file__).resolve().parent.parent / "fixtures" / "backend"
sys.path.insert(0, str(backend))
os.chdir(backend)

import conftest as c  # noqa: E402  (sets a placeholder DATABASE_URL)
from app import create_app  # noqa: E402

client = create_app().test_client()

# endpoint key (src/api/endpoints.ts) -> (module to patch, backend URL, fake db)
ROUTES = {
    "basketball.standings": ("basketball.standings", "/api/standings/Atlantic_Coast", c.basketball_db),
    "football.standings": ("football.standings", "/api/football/standings/Southeastern", c.football_db),
    "basketball.teams": ("basketball.teams", "/api/basketball_teams", c.basketball_db),
    "football.teams": ("football.teams", "/api/football_teams", c.football_db),
    "football.team": ("football.teams", "/api/football_team/Alabama", c.football_db),
}

for key, (module, url, make_db) in ROUTES.items():
    with patch(f"app.api.{module}.DatabaseManager") as db:
        db.return_value = make_db()
        response = client.get(url)
    if response.status_code != 200:
        sys.exit(f"{key}: {url} returned {response.status_code}: {response.get_data(as_text=True)[:300]}")
    path = out / f"{key}.json"
    path.write_text(json.dumps(response.get_json(), indent=1, sort_keys=True) + "\n")
    print(f"wrote {path.relative_to(out.parent.parent)}")
