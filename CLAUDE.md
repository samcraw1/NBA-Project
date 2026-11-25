# NBA Analytics Platform

## Project Purpose

Ball is Life is an NBA statistics dashboard evolving into an end-to-end data engineering and analytics platform. The primary goal is to develop practical skills in Python, SQL, ETL, AWS, Terraform, data modeling, orchestration, system design, and eventually machine learning.

This is a learning-first project. Technical understanding is more important than shipping features quickly.

## Current State

- React/TypeScript frontend using Vite, in `src/` (componentized dashboard with hash routing, dark/light themes, and "coming soon" analytics placeholders). Backend gaps it needs are listed in `FRONTEND_REQUIREMENTS.md`.
- Original Express/TypeScript backend in `server.ts`, using `nba-api-ts`.
- Python FastAPI replacement in `server.py` (root) using `nba_api` and `ThreadPoolExecutor`. All five routes are implemented and were tested against live NBA data, including the 404 and 422 cases, and through the Vite proxy. The full UI was also confirmed working against it in a browser. The legacy Express `server.ts` is still in the repo.
- Dashboard displays today's games, top scorers, player search, player cards, box scores, and play-by-play.
- The live dashboard data is fetched on demand from NBA.com. Automated ETL and deployed AWS infrastructure are planned, not confirmed implemented.
- Historical pipeline (local, run by hand): `extract.py` pulls 2025-26 player game logs (up to 3 attempts) plus the teams and players lists into `season_exports/`. `transform.py` merges team and player names onto the game logs, derives columns, runs validation asserts, and writes `processed/games_2025-26.csv` plus the table-shaped `processed/games.csv` and `processed/player_game_stats.csv`. Both folders are gitignored, so on a fresh checkout run `python extract.py` before `python transform.py`.
- Local PostgreSQL 14 (Homebrew) database `nba_project`, built by `sql/migrations/001` to `003` and loaded by hand with `\copy` from `processed/` and `season_exports/` (2026-11-24): `teams` 30 rows, `players` 5,198, `games` 1,230, `player_game_stats` 26,651. Primary keys, foreign keys and `NOT NULL` are in place. 5 of the 1,230 games have no home team in the data (both teams show "@"), so `games` has no home/away columns and `is_home` lives on the stats rows. There is no load script, FastAPI is not connected to the database, and the load is not repeatable: rerunning `\copy` fails on duplicate keys.
- The current `transform.py` and the Terraform were written and planned on another device. `transform.py` has since been run in this repo (2026-11-24) and its output loaded into Postgres; the Terraform has not been run. In an earlier scratch-copy run, all 26,651 game-log rows survive the team/player merges and no names are null. Two issues found in that run were fixed and re-verified the same day: duplicate `team_name`/`player_name` columns, and zero-attempt shooting percentages being filled with `0` (they are null again, only where there were no attempts).
- Terraform is written in `infrastructure/` (AWS provider, a private AES256-encrypted S3 bucket, and a $10/month budget alert at 80%). It was written on another device and has not been applied from this machine (no Terraform state exists here), so do not assume anything is deployed. There is no VPC, RDS, or IAM yet.
- `architecture.html` is a standalone architecture and roadmap diagram.

### Where I Am (2026-11-25)

- Learning SQL joins by hand. Working: player + stats join. Last query written: top 10 player-games by points with the player and team, a three-table join (`teams`, `player_game_stats`, `players`). My usual mistake is forgetting the `on` for each `join`; the other recurring ones are missing semicolons and ambiguous columns.
- Switched to a second MacBook. The code is pushed. The data is not in git. The database was dumped with `pg_dump` to `~/Desktop/nba_project.sql` (outside the repo) and restores with `createdb nba_project` then `psql nba_project < nba_project.sql`. Restore tested on this machine (2026-11-25): all 4 tables present, row counts match exactly (teams 30, players 5,198, games 1,230, player_game_stats 26,651). The dump's `ALTER TABLE ... OWNER TO sam` statements fail here (`role "sam" does not exist`, no such role on this machine) — harmless, tables just end up owned by the local user instead; data is unaffected.
- `requirements.txt` now exists at repo root, scoped to the real dependencies (`fastapi`, `uvicorn`, `nba_api`, `pandas`, `numpy`, `psycopg2-binary`) pinned to installed versions — not a blind `pip freeze`, since this machine's site-packages has unrelated packages from other projects that would have polluted it.
- Practice queries moved out of `sql/migrations/004.sql` (deleted) into separate files under `sql/queries/`.
- `sql/migrations/005_create_team_game_stats.sql` added 2026-11-25: `team_game_stats` table, composite primary key `(game_id, team_id)`, foreign keys to `games` and `teams`. Applied to the local `nba_project` database. No rows loaded yet — nothing populates it (would need a `GROUP BY game_id, team_id` aggregation over `player_game_stats`, not written).
- Practicing `group by` with joins (team scoring averages). Key thing that wasn't obvious at first: `GROUP BY` collapses many rows into one row per group — `group by t.full_name` with `avg(pgs.pts)` over `teams` joined to `player_game_stats` returns one row per team (30 rows), not one row per player. A column can only be in the `select` list if it's in the `group by` or wrapped in an aggregate (e.g. adding `players` to that query to show a player name would error, since player isn't part of the grouping). Also note: averaging `pts` straight off `player_game_stats` grouped by team gives "average points per player-game row for that team," not "average team score per game" — the latter needs summing per `(game_id, team_id)` first, then averaging those sums; a natural fit for the new `team_game_stats` table once it's populated, or a CTE.
- `CHECK` constraints added (`sql/migrations/006_add_check_constraints.sql`): nonnegative stats, makes ≤ attempts, rebounds add up, shooting percentages in range, on `player_game_stats` and `team_game_stats`. No extra indexes beyond the keys — decided not to matter right now.
- Window functions practiced in `sql/queries/windowfunction.sql`: a `rank()` over all points and a 5-game rolling average with `avg() over (partition by player_id order by game_date rows between 4 preceding and current row)`. The two-level "real" team scoring average (sum per game, then average per team) is still unwritten — planned as the first CTE.
- `load.py` added 2026-11-25: `get_connection`, `load_teams`, `load_players`, `load_games`, `load_player_game_stats`, each using `psycopg2` with `INSERT ... ON CONFLICT DO UPDATE` (upsert) instead of the old manual `\copy`. `load_teams` and `load_players` run twice on this machine, confirmed idempotent (same row counts both times: 30 teams, 5,227 players). `load_games` and `load_player_game_stats` are written to match the `games`/`player_game_stats` table columns exactly but **not run or tested anywhere** — this machine has no `processed/` data (network to `stats.nba.com` is blocked here) and `team_game_stats` still has no loader at all.
- Next: run `extract.py` + `transform.py` + `load.py` end to end on a machine that can reach `stats.nba.com`, to actually test `load_games`/`load_player_game_stats`. Then: a loader for `team_game_stats` (needs the `GROUP BY game_id, team_id` aggregation first), the two-level CTE for real team scoring averages, then incremental ingestion and row-count/referential-integrity validation in `load.py` itself. AWS (Athena over S3 is the cheapest way to run SQL there; RDS bills hourly) comes after that. Nothing is applied in AWS.

### API Contract

Preserve existing frontend-compatible routes and response fields:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/games` | Today's games and scores |
| GET | `/api/players` | Today's players and points |
| GET | `/api/games/{gameId}` | Game box score players |
| GET | `/api/games/{game_id}/plays` | Play-by-play events |
| GET | `/api/players/{player_id}` | Detailed player statistics from today's games |

Preserve camelCase JSON fields where the frontend expects them. Keep game IDs as strings to preserve leading zeros. Return 404 for missing players and appropriate upstream errors for failed NBA requests. Log actual exceptions without exposing secrets.

## Target Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Vercel |
| Backend | Python, FastAPI |
| Extraction | Python, nba_api |
| Transformation | Pandas initially; PySpark later |
| Database | PostgreSQL locally, AWS RDS PostgreSQL in cloud |
| Data lake | AWS S3, Parquet |
| Infrastructure | Terraform |
| Scheduling | Local/manual initially; EventBridge or Airflow later |
| Cloud processing | AWS Glue and Athena later |
| Monitoring | Python logging, CloudWatch |
| ML | scikit-learn later |

## Architecture

Live path: React -> FastAPI -> NBA API (optionally cached).

Historical path: NBA API -> Python extraction -> raw storage -> validation/transformation -> PostgreSQL -> FastAPI -> React.

Cloud target: S3 raw and processed datasets, private RDS PostgreSQL, AWS-hosted backend/worker, Vercel frontend. Terraform manages infrastructure. Add orchestration once the manual pipeline works.

## Learning Roadmap

Complete objectives incrementally. Do not jump ahead without a reason.

### 1. Data extraction (current priority)
- [x] Verify the Python FastAPI endpoints against the existing frontend.
- [x] Create standalone extraction scripts, independent of HTTP requests. (`extract.py`)
- [x] Retrieve historical league game logs, player information, and teams using `nba_api.stats`. (`extract_games`, `extract_teams`, `extract_players` in `extract.py`. The 2025-26 game logs came from an earlier version of the script; the current `extract.py` has not been run end to end. The teams and players functions were checked 2026-11-24: 30 teams, 5,198 players)
- [x] Start with one season; save datasets as CSV or JSON locally. (2025-26 season to `season_exports/`)
- [ ] Understand dictionaries, list comprehensions, DataFrames, API errors, and concurrency.
- [ ] Add timeouts and bounded retries; respect upstream rate limits. (`extract_games` has a retry loop with a 5s wait, bounded by `max_retries`, but it was written and never exercised. `extract_teams` and `extract_players` do not actually retry. No explicit `timeout=` set yet)

### 2. Data transformation
- [x] Inspect schemas, null values, duplicates, and data types. (`transform.py` asserts)
- [x] Standardize columns and dates; preserve source identifiers.
- [x] Calculate shooting percentages safely, handling zero attempts. (`np.where` guards on `fg3_pct`/`ft_pct`/`fg_pct` in `transform.py`)
- [x] Join player, team, and game datasets. (`transform.py` merges `teams.csv` and `players.csv` onto the game logs; verified no rows lost and no duplicate columns)
- [x] Keep raw data unchanged; write transformed data separately. (`season_exports/` raw -> `processed/` transformed)

### 3. SQL and data modeling
- [x] Run PostgreSQL locally before provisioning paid infrastructure. (PostgreSQL 14, database `nba_project`)
- [x] Create SQL migrations for players, teams, games, player_game_stats, and team_game_stats. (`sql/migrations/001` to `005`; `team_game_stats` added 2026-11-25 with composite PK and FKs to `games`/`teams`)
- [x] Define primary keys, foreign keys, constraints, and indexes. (primary keys, foreign keys, `NOT NULL` on all 5 tables; `CHECK` constraints added on `player_game_stats` and `team_game_stats` — nonnegative stats, makes ≤ attempts, rebounds add up, percentages in range — in `sql/migrations/006_add_check_constraints.sql`. No extra indexes beyond the keys, not pursued — skipped as not mattering right now)
- [x] Use `(game_id, player_id)` as the player-game grain and `(game_id, team_id)` as the team-game grain. (both are composite primary keys now; `team_game_stats` has no rows loaded yet, only the schema)
- [x] Store the team associated with each game statistic, not just a player's current team. (`team_id` on each `player_game_stats` row)
- [x] Store made/attempted shots as numeric fields, not display strings. (`fgm`/`fga`/`fg3m`/`fg3a`/`ftm`/`fta` are `INTEGER`; percentages are nullable `NUMERIC`)
- [x] Write SQL manually to practice joins, CTEs, aggregations, and window functions. (`select`, `where`, `group by`, `avg`, `order by`, `limit`, two- and three-table `inner join`s with aliases, in `sql/queries/`: `high_scoring_games.sql`, `team_player_points.sql`, `team_avg_points.sql`, `player_avg_points.sql`. Window functions in `sql/queries/windowfunction.sql`: `rank() over (order by pts desc)` and a 5-game rolling average with `avg(pts) over (partition by player_id order by game_date rows between 4 preceding and current row)`. Want to come back to this; the two-level "real" team scoring average CTE is still unwritten)

### 4. ETL pipeline
- [x] Separate extraction, transformation, and loading into reusable modules. (`extract.py`, `transform.py`, `load.py`, each a standalone script)
- [ ] Backfill one season, then expand to multiple seasons. (one season, 2025-26, only)
- [ ] Ingest completed games incrementally.
- [x] Use transactions and upserts so reruns do not duplicate records. (`load.py` uses `psycopg2` with `INSERT ... ON CONFLICT DO UPDATE` for all 4 tables with data; `load_teams`/`load_players` run twice on this machine 2026-11-25 with no errors and no row-count change, confirmed idempotent. `load_games`/`load_player_game_stats` are written the same way but not run or tested anywhere yet — this machine has no `processed/` data, network to `stats.nba.com` is blocked here)
- [ ] Validate row counts, uniqueness, required fields, and referential integrity. (the database enforces uniqueness/FKs/CHECKs on load; nothing in `load.py` itself checks row counts before/after)
- [ ] Add tests using saved fixtures rather than relying on live NBA requests.

### 5. Analytics
- [ ] Season scoring leaders and team scoring averages.
- [ ] Rolling five-game player averages.
- [ ] Season-over-season comparisons and player consistency.
- [ ] Add database-backed API endpoints without breaking live endpoints.

### 6. AWS and Terraform
- [ ] Provision S3, VPC, subnets, security groups, and small single-AZ RDS PostgreSQL. (S3 bucket is defined in `infrastructure/s3.tf`; apply not confirmed; VPC and RDS not started)
- [ ] Keep RDS private; explicitly design connectivity for backend and ingestion workers.
- [ ] Use least-privilege IAM, encrypted storage, and managed secrets. (S3 encryption and public access block are defined in Terraform; IAM policies and secrets not done)
- [ ] Add a budget alert before provisioning paid resources. (`infrastructure/budget.tf`: $10/month, alert at 80%; written, apply not confirmed)
- [ ] Store raw and processed data in S3; introduce partitioned Parquet.
- [ ] Review `terraform plan` before apply. Never apply or destroy without explicit approval.
- [ ] Avoid NAT gateways, managed Airflow, and other expensive always-on services initially.

### 7. Orchestration and monitoring
- [ ] Schedule daily ingestion of completed games.
- [ ] Add retries, structured logs, pipeline run status, and failure alerts.
- [ ] Learn Airflow locally before considering managed deployment.
- [ ] Experiment with PySpark, Glue, and Athena after the basic pipeline works. Spark is a learning objective, not a requirement for this small dataset.

### 8. Machine learning (later)
- [ ] Predict next-game player points using historical data.
- [ ] Build features using only information available before the predicted game.
- [ ] Compare against a rolling-average baseline.
- [ ] Use chronological train/test splits to avoid data leakage.
- [ ] Evaluate with MAE and document results before deployment.

## Suggested Directory Structure

Adapt to the existing repository; do not reorganize working files unnecessarily.

```text
NBA-Project/
  src/                      # React frontend
  server.ts                 # Legacy Express backend during migration
  backend/                  # FastAPI application
  pipeline/
    extract.py
    transform.py
    load.py
  sql/
    migrations/
    queries/
  season_exports/           # Raw extracted data; gitignored
  processed/                # Cleaned data; gitignored
  infrastructure/           # Terraform
  tests/
  CLAUDE.md
  README.md
```

## Instructions for Claude

- Act as a technical mentor and pair programmer, not an autonomous feature factory.
- Inspect existing code before suggesting changes. Distinguish implemented, drafted, and planned functionality.
- Explain the objective, why it matters, and the smallest next step.
- Prefer short, literal explanations and small code examples.
- Keep responses short. No long essays: a few sentences and one small example by default, and go deeper only when I ask.
- When teaching Python, compare unfamiliar syntax with TypeScript equivalents when useful.
- For core Python, SQL, ETL, and Terraform exercises, provide hints or scaffolding first; allow me to write the implementation. Give complete implementations when explicitly requested.
- When reviewing my code, identify the exact problematic line, explain why it fails, and suggest the smallest fix. Do not rewrite the whole file unnecessarily.
- Explain engineering tradeoffs, including cost, complexity, security, and reliability.
- Avoid adding frameworks or cloud services simply to make the architecture look impressive.
- Keep the existing frontend stable; prioritize data engineering over UI polish.
- Do not fabricate API responses, test results, or deployment status. Run relevant tests when possible and report what was actually verified.
- Never commit credentials, `.env` files, Terraform state, or generated datasets. Use environment variables and managed secrets.
- Do not deploy paid resources, run destructive database operations, or push changes without explicit approval.
- Update the README and roadmap when meaningful milestones are completed and verified.

## Definition of Success

The project can reliably ingest historical NBA data, validate and transform it, store it without duplicates, answer analytical questions through SQL, and serve results through FastAPI. The pipeline is reproducible, tested, documented, and eventually automated in AWS at a controlled cost.

I should be able to explain and reproduce the core implementation independently, including why each technology was chosen and how the system handles failures.
