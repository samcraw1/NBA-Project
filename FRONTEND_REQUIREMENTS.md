# Frontend requirements for the backend

The frontend only uses the five existing FastAPI routes. Nothing below has been built.
Each item is something the UI would use if you add it. They're ordered roughly by how soon
they help, and the later ones depend on your SQL/ETL work. Names and shapes are proposals;
change them to whatever fits your data model.

Keep the existing camelCase JSON fields, and keep game IDs as strings.

## A. Small improvements to existing routes

These need no database, only changes in `server.py`.

### A1. `GET /api/games`: add reliable game state

- **Why:** the UI guesses live / final / upcoming by parsing the `status` text
  (`gameState()` in `src/format.ts`). Text like "PPD" or "Halftime" can be misclassified.
- **Add fields** (NBA's live scoreboard already has them):
  ```json
  {
    "gameId": "0022600287",
    "status": "Final",
    "gameStatus": 3,
    "period": 4,
    "gameClock": "PT00M00.00S",
    "gameTimeUTC": "2026-11-24T00:30:00Z",
    "away": { "teamId": 1610612763, "tricode": "MEM", "score": 117 },
    "home": { "teamId": 1610612766, "tricode": "CHA", "score": 111 }
  }
  ```
  `gameStatus`: 1 = not started, 2 = in progress, 3 = final.

### A2. `GET /api/games/{gameId}`: a real box score

- **Why:** today it returns only `pts`, `pos` and `played` per player, with no team grouping,
  so the box score page can't show teams, rebounds, assists or shooting.
- **Proposed response:**
  ```json
  {
    "gameId": "0022600287",
    "teams": [
      {
        "teamId": 1610612763,
        "tricode": "MEM",
        "players": [
          {
            "playerId": 1642883,
            "playerName": "Sion James",
            "pos": "SF",
            "starter": true,
            "played": true,
            "minutes": "PT27M33.00S",
            "pts": 5, "reb": 4, "ast": 4, "stl": 2, "blk": 0, "tov": 1,
            "fg": "2/6", "threes": "1/4", "ft": "0/0", "plusMinus": -10
          }
        ]
      }
    ]
  }
  ```
- This changes the response shape, so the frontend's `GamePlayer` type and the box score
  component would need to change with it. Say when you're ready and the frontend can follow.

### A3. `GET /api/players`: add team and position

- **Why:** the directory can't show or filter by team, and the top-15 list can't show a
  team logo.
- **Add per player:** `teamId`, `tricode`, `pos` (nullable).

### A4. Error codes

- An unknown or invalid `gameId` currently returns **502** ("could not reach NBA.com").
  A **404** would let the UI say "game not found" instead of a generic error.
- `position` is `null` for many bench players. The frontend already handles this.
- `/api/players` and `/api/players/{playerId}` fetch every game's box score on each call.
  The frontend calls `/api/players` once per page load and shares the result, but a short
  backend cache (for example 15 to 30 seconds) would make everything faster.

## B. Needs the data pipeline (SQL / ETL)

These match the "coming soon" pages in the app. None of them have data yet.

### B1. Historical player stats: `GET /api/players/{playerId}/games?season=2025-26`

- **Purpose:** game log for one player across a season.
- **Response:**
  ```json
  [
    { "gameId": "0022500112", "date": "2025-10-24", "opponent": "BOS", "home": true,
      "minutes": 34.2, "pts": 28, "reb": 7, "ast": 5, "fgm": 10, "fga": 19 }
  ]
  ```
  Store made and attempted shots as numbers, not strings, so the API can return them as
  numbers too.

### B2. Season rankings: `GET /api/leaders?season=2025-26&stat=pts&limit=25`

- **Purpose:** league leaders for one stat.
- **Response:** `[{ "rank": 1, "playerId": 123, "playerName": "...", "tricode": "...", "value": 31.4, "gamesPlayed": 20 }]`

### B3. Player trends: `GET /api/players/{playerId}/trends?stat=pts&window=5`

- **Purpose:** rolling average over recent games.
- **Response:** `[{ "gameId": "...", "date": "...", "value": 22, "rollingAvg": 24.6 }]`

### B4. Team analytics: `GET /api/teams` and `GET /api/teams/{teamId}/stats?season=2025-26`

- **Purpose:** team list, then scoring and results for one team.
- **Response (stats):** `{ "teamId": 1, "tricode": "...", "gamesPlayed": 20, "wins": 12, "losses": 8, "ptsPerGame": 114.2, "oppPtsPerGame": 111.0 }`

### B5. Player comparison: `GET /api/compare?players=123,456&season=2025-26`

- **Purpose:** the same stat set for two players side by side.
- **Response:** `[{ "playerId": 123, "playerName": "...", "stats": { "pts": 28.1, "reb": 7.2, "ast": 5.5 } }]`

### B6. ML predictions: `GET /api/predictions/players/{playerId}/next-game`

- **Purpose:** projected points for a player's next game.
- **Response:** `{ "playerId": 123, "predictedPts": 24.3, "baselinePts": 23.8, "model": "...", "mae": 4.9, "trainedThrough": "2026-11-20" }`
- Always include the baseline and the model's error so the UI can show them next to the
  prediction. The UI should never show a prediction on its own.

### B7. Pipeline monitoring: `GET /api/pipeline/runs?limit=20`

- **Purpose:** history of ingestion runs.
- **Response:** `[{ "runId": "...", "startedAt": "...", "finishedAt": "...", "status": "success", "rowsLoaded": 1240, "error": null }]`

## Notes

- The frontend never calls NBA.com directly and holds no keys, hosts or database
  connections. It talks only to `/api/*`, which Vite proxies to `localhost:3001` in
  development (see `vite.config.ts`).
- When you deploy, the frontend will need `/api` routed to the backend (a Vercel rewrite or
  a configured API base URL). That is a deployment decision, so it is not done here.
