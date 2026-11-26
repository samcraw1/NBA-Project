# Handoff: where the project is (2026-11-26)

Written for an agent catching up. Everything here was run and checked on 2026-11-26 unless marked **not tested**.
No secrets, passwords, emails, IP addresses or secret ARNs are in this file. Get the RDS hostname with
`cd infrastructure && AWS_PROFILE=nba-terraform terraform output rds_endpoint`.

## 1. The project and how to work with the user
"Ball is Life" is an NBA dashboard that is becoming a data engineering platform. It is **learning-first**: the user is moving from
TypeScript to Python, SQL and AWS, and is preparing for data engineering interviews. Standing rules (also in `CLAUDE.md`):
- Keep replies short and simple; compare Python/SQL to TypeScript when it helps.
- For SQL, Python pipeline code and Terraform, give **hints first** and let the user write it. Write it yourself only when told ("u write it", "fix it").
- **Ask before** pushing to GitHub, `terraform apply`/destroy, deleting anything, or changing AWS. Never expose or commit credentials or generated datasets.
- Do not claim things the user has not done (for example, they have **not** used PySpark).

## 2. The story: the "current season" change
**Before:** the Scores, Games and Players pages showed only today's live NBA.com games, so they were empty on days without games. The Players search only
covered players in those games. The database was a frozen snapshot of 2025-26 (last game 2026-04-12) and only the Analytics page used it. The real season is
2026-27, and NBA.com already had it. Nothing refreshed the database. This made the app look broken.

**After (what changed):**
- `server.py`
  - `/api/games` returns today's games, or walks back (up to 10 days, `ScoreboardV3`) to the latest day that had games. Same JSON plus `state` (1/2/3) and `gameDate`.
  - Short in-memory cache for NBA.com (`cached()`): 30 s while a game is live, 5 min otherwise, 1 h for finished box scores. `/api/players`, `/api/games/{id}` and
    `/api/players/{id}` (the live one-game card) all use the same slate.
  - Database routes: `/api/players/search?q=` (accent-insensitive, `translate()` plus `fold()`), `/api/players/{id}/season?season=` (averages, last 5 games,
    seasons, `through` date), `/api/seasons`, and `season`-filtered `/api/averages`, `/api/team_averages`, `/api/team_player_points`.
    `resolve_season()` defaults to the newest season in `games`. `/api/players/search` must stay declared **before** `/api/players/{player_id}` (else 422).
  - `db()` connects with `DATABASE_URL` or falls back to local `dbname=nba_project`. Driver is `psycopg` v3, **not** psycopg2.
- Frontend (`src/`, look unchanged): `useFetch(url, refreshMs)` polls silently (30 s while any game is live, 5 min otherwise); headings say "Last night's games" via
  `slateWords()`; `PlayersPage` searches the database; `PlayerCardModal` shows an optional "Latest game" (NBA.com) plus "Season averages", a season switcher and
  "Last 5 games" (database); `SeasonStats` on the Analytics page follows the newest season.
- Pipeline: `python extract.py [season]` -> `python transform.py [season]` -> `python load.py`, wrapped by `python refresh.py [season]` (default season `2026-27`).
  - `transform.py` derives `season` from `season_id` (22026 -> "2026-27"). The old `.map({22025: ...})` would have produced NaN for new seasons. It now reads only
    `season_exports/games_{season}.csv`.
  - `load.py` upserts (`ON CONFLICT DO UPDATE`), so reruns are safe. It reads CSVs with `game_id` as text (leading zeros matter) and converts NaN to NULL via `clean()`.
  - `scripts/rds_env.sh` (run with `source`) builds `DATABASE_URL` for RDS from Secrets Manager at run time. Use the admin `default` AWS profile.

## 3. Where things are right now
| Thing | State |
|---|---|
| App | Backend `uvicorn server:app --port 3001 --reload`, frontend `npm run dev` on 5173 (Vite proxies `/api` to 3001). **Reads local Postgres.** |
| Local Postgres `nba_project` | 2025-26 + 2026-27: 1,500 games, 32,683 player-game rows, newest game 2026-11-25 |
| RDS `nba-project` | Same data as local (loaded 2026-11-26, ~5 min). `db.t4g.micro`, PG 14.22, 20 GB, single-AZ, encrypted, public but locked to one IP, no deletion protection, 1-day backups. About $15/month while running. |
| S3 `nba-project-data-506726968427` | Private, AES256, no versioning. `raw/` (CSVs), `processed/{games,games_2025-26,games_2026-27,player_game_stats}/`, `athena-results/`, `practice/`. Both seasons are uploaded (2026-27 files carry a `_2026-27` suffix so they never overwrite 2025-26; uploaded with `s3practice.py`). |
| Athena/Glue | Glue DB `nba`, table `player_game_stats` over `processed/player_game_stats/` (OpenCSVSerde, 27 columns). It reads **every** file in that folder, so a new season is a new file there. Returns 32,683 rows (26,651 from 2025-26 + 6,032 from 2026-27) and matches Postgres. Season is the first 5 characters of `game_id` (`00225` = 2025-26, `00226` = 2026-27). Table property `use.null.for.invalid.data = true` is required: blank percentages (no shot attempts) are real NULLs and otherwise queries on `fg_pct`/`fg3_pct`/`ft_pct` fail with `NumberFormatException: empty String`. |
| Lambda `nba-ingestion` + EventBridge rule | Deployed. Rule is **DISABLED**: `stats.nba.com` times out when called from AWS IPs (3 x 30 s read timeouts), so extraction must run off AWS. |
| Budget | One account-wide budget. Limit raised $10 -> $50 (alert at 80%). Month-to-date was $26.63 (forecast $30.90), mostly from an **earlier project**, not this one. |

**Terraform** (`infrastructure/`, state is **local only**, run it from this Mac, never the other one): S3 bucket + public-access block + encryption, budget, RDS +
security group + subnet group, Lambda + role/policy + layer, EventBridge rule/target/permission, and (imported today) the Glue DB and table in `athena.tf`.
`terraform plan` is clean ("No changes"). `athena.tf` ignores `owner`, `parameters`, `number_of_buckets` and `skewed_info` because Athena fills them in itself.
`plan` needs `alert_email` and `my_ip_cidr`; read both from the state (`terraform state show aws_budgets_budget.monthly` and `aws_security_group.rds`) and pass them as
`TF_VAR_*`. Provider profile is `nba-terraform` (policy `nba-terraform-extra`, version 3, JSON in `infrastructure/nba-terraform-policy.json`). Admin changes use the `default` profile.

## 4. Gotchas
- NBA.com blocks/throttles AWS IPs. Run extraction from a home machine.
- RDS Data API does **not** work with this engine (Aurora Serverless only). Use a normal connection string.
- IAM changes take ~40 s to take effect (the first call after a policy change is denied until then).
- The RDS **security group** allows one IP only: if the user's IP changes, they are locked out of RDS until `my_ip_cidr` is updated and applied.
- `load.py` runs row by row in one transaction (about 5 min for ~6,000 stats rows to RDS). That is why `transform.py` processes one season only.
- The `requirements.txt` is stale (lists `psycopg2-binary`; the code uses `psycopg[binary]` and also needs `boto3` for the Lambda). Not yet regenerated.
- `iam_reference.txt` in `infrastructure/` and several scratch files in the repo root (`listdir.py`, `newfile.py`, `s3practice.py`, ...) are the user's or throwaway.
- Athena in the console defaults to the `default` database: select `nba` or write `nba.player_game_stats`, or you get `TABLE_NOT_FOUND`.
- NBA.com box scores for finished games stay available for at least last night (checked), so "last night" needs no database.

## 5. Not done / next
1. For each new season, upload its CSVs with a season suffix (edit `season` in `s3practice.py`, run it from the project root). Do not use `aws s3 sync processed ...` for this: it would put flat `processed/*.csv` files next to the per-table folders. Athena has only the `player_game_stats` table; there is no `players`/`games` table yet (each would need its own S3 folder, because a table points at a folder and `raw/` mixes file types).
2. The user wants to write a daily scheduler themselves later: cron/launchd or GitHub Actions running `refresh.py`, off AWS. Actions would need DB credentials as secrets and RDS reachable from GitHub.
3. The 30 s live refresh is **not tested** with a real in-progress game.
4. The SQL behind player search and the season card was written by Claude. Offer it to the user as a rewrite exercise (`distinct on`, `lateral`).
5. Learning roadmap: CTEs and window functions, Athena tables for games/players, Glue + PySpark (not started), CloudWatch alarms, Step Functions only if it earns its place.
6. Nothing from 2026-11-26 is committed. Ask before committing or pushing.

## 6. Commands
```bash
source .venv/bin/activate
python refresh.py                                   # current season into LOCAL Postgres
AWS_PROFILE=default source scripts/rds_env.sh && python refresh.py   # same into RDS (writes to AWS)
uvicorn server:app --port 3001 --reload             # backend
npm run dev                                         # frontend, http://localhost:5173
npm run typecheck && npm run build                  # frontend checks
cd infrastructure && AWS_PROFILE=nba-terraform terraform plan   # with the TF_VAR_* described above
```
Prompt cheat sheet: `%` is the shell, `nba_project=#` is `psql`. Do not paste SQL into the shell or shell commands into `psql`.
