# NBA Analytics Platform

## Project Purpose

Ball is Life is an NBA statistics dashboard evolving into an end-to-end data engineering and analytics platform. The primary goal is to develop practical skills in Python, SQL, ETL, AWS, Terraform, data modeling, orchestration, system design, and eventually machine learning.

This is a learning-first project. Technical understanding is more important than shipping features quickly.

## Current State

- React/TypeScript frontend using Vite, in `src/` (componentized dashboard with hash routing, dark/light themes, and "coming soon" analytics placeholders). Backend gaps it needs are listed in `FRONTEND_REQUIREMENTS.md`.
- Original Express/TypeScript backend in `server.ts`, using `nba-api-ts`.
- Python FastAPI replacement in `server.py` (root) using `nba_api` and `ThreadPoolExecutor`. All five routes are implemented and were tested against live NBA data, including the 404 and 422 cases, and through the Vite proxy. The full UI was also confirmed working against it in a browser. The legacy Express `server.ts` is still in the repo.
- Dashboard displays today's games, top scorers, player search, player cards, box scores, and play-by-play.
- Current data is fetched on demand from NBA.com. Historical persistence, automated ETL, and AWS infrastructure are planned, not confirmed implemented.

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
- [x] Retrieve historical league game logs, player information, and teams using `nba_api.stats`. (`extract_games`, `extract_teams`, `extract_players` in `extract.py`; teams/players verified, 30 teams / 5135 players)
- [x] Start with one season; save datasets as CSV or JSON locally. (2025-26 season to `season_exports/`)
- [ ] Understand dictionaries, list comprehensions, DataFrames, API errors, and concurrency.
- [x] Add timeouts and bounded retries; respect upstream rate limits. (`extract_games` retries on failure with a 5s wait, bounded by `max_retries`; no explicit `timeout=` set yet, relies on `nba_api`'s default)

### 2. Data transformation
- [x] Inspect schemas, null values, duplicates, and data types. (`transform.py` asserts)
- [x] Standardize columns and dates; preserve source identifiers.
- [x] Calculate shooting percentages safely, handling zero attempts. (`np.where` guards on `fg3_pct`/`ft_pct`/`fg_pct` in `transform.py`)
- [ ] Join player, team, and game datasets. (single dataset only so far)
- [x] Keep raw data unchanged; write transformed data separately. (`season_exports/` raw -> `processed/` transformed)

### 3. SQL and data modeling
- [ ] Run PostgreSQL locally before provisioning paid infrastructure.
- [ ] Create SQL migrations for players, teams, games, player_game_stats, and team_game_stats.
- [ ] Define primary keys, foreign keys, constraints, and indexes.
- [ ] Use `(game_id, player_id)` as the player-game grain and `(game_id, team_id)` as the team-game grain.
- [ ] Store the team associated with each game statistic, not just a player's current team.
- [ ] Store made/attempted shots as numeric fields, not display strings.
- [ ] Write SQL manually to practice joins, CTEs, aggregations, and window functions.

### 4. ETL pipeline
- [ ] Separate extraction, transformation, and loading into reusable modules.
- [ ] Backfill one season, then expand to multiple seasons.
- [ ] Ingest completed games incrementally.
- [ ] Use transactions and upserts so reruns do not duplicate records.
- [ ] Validate row counts, uniqueness, required fields, and referential integrity.
- [ ] Add tests using saved fixtures rather than relying on live NBA requests.

### 5. Analytics
- [ ] Season scoring leaders and team scoring averages.
- [ ] Rolling five-game player averages.
- [ ] Season-over-season comparisons and player consistency.
- [ ] Add database-backed API endpoints without breaking live endpoints.

### 6. AWS and Terraform
- [ ] Provision S3, VPC, subnets, security groups, and small single-AZ RDS PostgreSQL.
- [ ] Keep RDS private; explicitly design connectivity for backend and ingestion workers.
- [ ] Use least-privilege IAM, encrypted storage, and managed secrets.
- [ ] Add a budget alert before provisioning paid resources.
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
  data/                     # Local generated data; gitignored
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
