import logging
import json
import os
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from nba_api.live.nba.endpoints import scoreboard, boxscore, playbyplay
from nba_api.stats.endpoints import scoreboardv3

log = logging.getLogger("uvicorn.error")


app = FastAPI()

frontend_origin = os.environ.get("FRONTEND_ORIGIN")
if frontend_origin:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin],
        allow_methods=["GET"],
        allow_headers=["*"]
    )

NBA_LIVE_ENABLED = os.environ.get("NBA_LIVE_ENABLED", "true").lower() == "true"
# Walking back to "last night" uses stats.nba.com, which times out from AWS. On AWS set this to false:
# an empty slate then falls back to the database, which the daily refresh keeps current.
NBA_LOOKBACK_ENABLED = os.environ.get("NBA_LOOKBACK_ENABLED", "true").lower() == "true"


def db():
    # DATABASE_URL points at RDS (or anything else); with it unset we use the local database.
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg.connect(database_url)

    secret_value = os.environ.get("DATABASE_SECRET")
    if secret_value:
        secret = json.loads(secret_value)
        return psycopg.connect(
            host=os.environ.get("DATABASE_HOST", secret.get("host")),
            port=int(os.environ.get("DATABASE_PORT", secret.get("port", 5432))),
            dbname=os.environ.get("DATABASE_NAME", "nba_project"),
            user=secret["username"],
            password=secret["password"],
            sslmode="require",
            connect_timeout=5,
        )

    return psycopg.connect("dbname=nba_project")


@app.get("/health")
def health():
    return {"status": "ok"}


def database_games():
    with db() as conn:
        rows = conn.execute("""
            select g.game_id, g.game_date, pgs.team_id, t.abbreviation,
                   bool_or(pgs.is_home) as is_home, sum(pgs.pts) as score
            from games as g
            inner join player_game_stats as pgs on pgs.game_id = g.game_id
            inner join teams as t on t.team_id = pgs.team_id
            where g.game_date = (select max(game_date) from games)
            group by g.game_id, g.game_date, pgs.team_id, t.abbreviation
            order by g.game_id, is_home
        """).fetchall()

    games = {}
    for game_id, game_date, team_id, tricode, is_home, score in rows:
        game = games.setdefault(game_id, {
            "gameId": game_id,
            "status": "Final",
            "state": FINAL,
            "gameDate": game_date.isoformat(),
        })
        game["home" if is_home else "away"] = {
            "teamId": team_id,
            "tricode": tricode,
            "score": int(score or 0),
        }
    return [game for game in games.values() if "home" in game and "away" in game]


def database_players():
    with db() as conn:
        rows = conn.execute("""
            select p.player_id, p.full_name, pgs.pts
            from player_game_stats as pgs
            inner join players as p on p.player_id = pgs.player_id
            inner join games as g on g.game_id = pgs.game_id
            where g.game_date = (select max(game_date) from games)
            order by pgs.pts desc, p.full_name
            limit 30
        """).fetchall()
    return [{"playerId": r[0], "playerName": r[1], "pts": r[2] or 0} for r in rows]


def database_game_players(game_id):
    with db() as conn:
        rows = conn.execute("""
            select p.player_id, p.full_name, pgs.pts, pgs.zero_minutes
            from player_game_stats as pgs
            inner join players as p on p.player_id = pgs.player_id
            where pgs.game_id = %s
            order by pgs.pts desc, p.full_name
        """, (game_id,)).fetchall()
    return [
        {"playerId": r[0], "playerName": r[1], "pts": r[2] or 0,
         "pos": None, "played": not r[3]}
        for r in rows
    ]


def bad_gateway():
    return JSONResponse(status_code=502, content={"error": "could not reach NBA.com"})


# --- Short-lived cache for NBA.com responses ------------------------------------
# The page polls every 30s to 5 min and /api/players loads one box score per game.
# Without this, every poll would hit NBA.com again.
_cache = {}


def cached(key, ttl_for, fetch):
    # ttl_for(value) says how many seconds to keep the value. It runs AFTER fetching,
    # because a live game should be kept for seconds and a finished one for much longer.
    entry = _cache.get(key)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    value = fetch()
    _cache[key] = (time.monotonic() + ttl_for(value), value)
    return value


# NBA.com game status codes
SCHEDULED, LIVE, FINAL = 1, 2, 3
LOOKBACK_DAYS = 10


def fetch_slate():
    # Today's games if there are any (scheduled, live or finished). Otherwise walk back one
    # day at a time to the most recent day that had games ("last night").
    today = scoreboard.ScoreBoard().get_dict()["scoreboard"]
    today_date, games = date.fromisoformat(today["gameDate"]), today["games"]
    day = today_date
    for _ in range(LOOKBACK_DAYS if NBA_LOOKBACK_ENABLED else 0):
        if games:
            break
        day -= timedelta(days=1)
        games = scoreboardv3.ScoreboardV3(game_date=day.isoformat(), timeout=15).get_dict()["scoreboard"]["games"]
    if not games:
        day = today_date
    return {"date": day.isoformat(), "games": games}


def slate_ttl(slate):
    return 30 if any(g["gameStatus"] == LIVE for g in slate["games"]) else 300


def get_slate():
    return cached("slate", slate_ttl, fetch_slate)


def box_ttl(box):
    return 3600 if box["game"].get("gameStatus") == FINAL else 30


def get_boxscore(game_id):
    return cached(f"box:{game_id}", box_ttl, lambda: boxscore.BoxScore(game_id).get_dict())


def get_slate_boxes():
    # Box scores for the games on the slate. Games that haven't tipped off have none yet.
    started = [g for g in get_slate()["games"] if g["gameStatus"] != SCHEDULED]

    def safe(g):
        try:
            return get_boxscore(g["gameId"])
        except Exception as err:
            log.warning("box score %s failed: %s", g["gameId"], err)
            return None

    with ThreadPoolExecutor() as pool:
        boxes = [b for b in pool.map(safe, started) if b]
    if started and not boxes:
        raise RuntimeError("no box scores available")
    return boxes


@app.get("/api/games")
def get_games():
    # Live from NBA.com first. If it is off, down, or has no games, show the database's latest day.
    if NBA_LIVE_ENABLED:
        try:
            slate = get_slate()
            if slate["games"]:
                return [
                    {
                        "gameId": g["gameId"],
                        "status": g["gameStatusText"].strip(),
                        "state": g["gameStatus"],
                        "gameDate": slate["date"],
                        "away": {"teamId": g["awayTeam"]["teamId"], "tricode": g["awayTeam"]["teamTricode"], "score": g["awayTeam"]["score"]},
                        "home": {"teamId": g["homeTeam"]["teamId"], "tricode": g["homeTeam"]["teamTricode"], "score": g["homeTeam"]["score"]},
                    }
                    for g in slate["games"]
                ]
        except Exception as err:
            log.warning("live games failed, using database: %s", err)
    try:
        return database_games()
    except Exception as err:
        log.warning("database games query failed: %s", err)
        return JSONResponse(status_code=502, content={"error": "could not read game data"})


@app.get("/api/players")
def get_players():
    if NBA_LIVE_ENABLED:
        try:
            players = [
                {"playerId": p["personId"], "playerName": p["name"], "pts": p["statistics"]["points"]}
                for b in get_slate_boxes()
                for p in b["game"]["homeTeam"]["players"] + b["game"]["awayTeam"]["players"]
            ]
            if players:
                return players
        except Exception as err:
            log.warning("live players failed, using database: %s", err)
    try:
        return database_players()
    except Exception as err:
        log.warning("database players query failed: %s", err)
        return JSONResponse(status_code=502, content={"error": "could not read player data"})


@app.get("/api/games/{gameId}")
def get_game(gameId: str):
    if NBA_LIVE_ENABLED:
        try:
            box = get_boxscore(gameId)
            players = box["game"]["homeTeam"]["players"] + box["game"]["awayTeam"]["players"]
            return [
                {
                    "playerId": p["personId"],
                    "playerName": p["name"],
                    "pts": p["statistics"]["points"],
                    "pos": p.get("position"),
                    "played": p["played"] == "1"
                }
                for p in players
            ]
        except Exception as err:
            log.warning("live box score failed, using database: %s", err)
    try:
        return database_game_players(gameId)
    except Exception as err:
        log.warning("database box score query failed: %s", err)
        return JSONResponse(status_code=502, content={"error": "could not read box score"})


@app.get("/api/games/{game_id}/plays")
def get_plays(game_id: str):
    if not NBA_LIVE_ENABLED:
        return []
    try:
        pbp = playbyplay.PlayByPlay(game_id).get_dict()
        return [
            {
                "period": a["period"],
                "description": a["description"],
                "clock": a["clock"],
                "score": f'{a["scoreAway"]} - {a["scoreHome"]}',
            }
            for a in pbp["game"]["actions"]
        ]
    except Exception:
        return bad_gateway()


@app.get("/api/games/{game_id}/player-rankings")
def get_game_player_rankings(game_id: str):
    with db() as conn:
        rows = conn.execute("""
            select
                p.player_id,
                p.full_name,
                pgs.game_id,
                pgs.pts,
                rank() over (
                    partition by pgs.game_id
                    order by pgs.pts desc
                ) as game_rank
            from player_game_stats as pgs
            inner join players as p on p.player_id = pgs.player_id
            where pgs.game_id = %s
            order by game_rank, p.full_name
        """, (game_id,)).fetchall()
        return [
            {
                "playerId": row[0],
                "playerName": row[1],
                "gameId": row[2],
                "pts": row[3],
                "gameRank": row[4],
            }
            for row in rows
        ]

def resolve_season(conn, season):
    # No season given -> use the newest one in the database.
    if season:
        return season
    return conn.execute("select max(season) from games").fetchone()[0]


def default_min_games(conn, season):
    # A quarter of a full schedule (20 for an 82-game year), but never below 5,
    # so early in a season the list isn't empty.
    team_games = conn.execute("""
        select max(n) from (
            select count(distinct pgs.game_id) as n
            from player_game_stats as pgs
            inner join games as g on pgs.game_id = g.game_id
            where g.season = %s
            group by pgs.team_id
        ) as t
    """, (season,)).fetchone()[0] or 0
    return max(5, team_games // 4)


@app.get("/api/seasons")
def get_seasons():
    with db() as conn:
        rows = conn.execute(
            "select distinct season from games where season is not null order by season desc"
        ).fetchall()
        return [r[0] for r in rows]


@app.get("/api/averages")
def get_averages(season: str | None = None, min_games: int | None = None):
    with db() as conn:
        season = resolve_season(conn, season)
        if min_games is None:
            min_games = default_min_games(conn, season)
        rows = conn.execute("""
            with average_ppg as (
                select
                    p.player_id,
                    p.full_name,
                    g.season,
                    avg(pgs.pts) as ppg
                from players as p
                inner join player_game_stats as pgs on pgs.player_id = p.player_id
                inner join games as g on pgs.game_id = g.game_id
                where g.season = %s
                group by p.player_id, p.full_name, g.season
                having count(*) >= %s
            )
            select
                player_id,
                full_name,
                season,
                ppg,
                rank() over (partition by season order by ppg desc) as average_rank
            from average_ppg
            order by season, average_rank
            limit 10
        """, (season, min_games)).fetchall()
        return [
            {"player_id": r[0], "full_name": r[1], "season": r[2], "average_points": r[3], "average_rank": r[4]}
            for r in rows
        ]


@app.get("/api/fantasy/season-rankings")
def get_fantasy_season_rankings(season: str | None = None, min_games: int | None = None):
    # Season average fantasy points per player, ranked within the season. Games with zero
    # minutes (DNPs) are left out, and so are players with too few games to rank fairly.
    with db() as conn:
        season = resolve_season(conn, season)
        if min_games is None:
            min_games = default_min_games(conn, season)
        rows = conn.execute("""
            with player_season_fantasy as (
                select p.player_id, p.full_name, g.season,
                       avg(pgs.fantasy_pts) as avg_fantasy_pts, count(*) as games
                from players as p
                join player_game_stats as pgs on pgs.player_id = p.player_id
                join games as g on g.game_id = pgs.game_id
                where g.season = %s and pgs.zero_minutes = false
                group by p.player_id, p.full_name, g.season
                having count(*) >= %s
            )
            select
                player_id,
                full_name,
                season,
                avg_fantasy_pts,
                games,
                rank() over (
                    partition by season
                    order by avg_fantasy_pts desc
                ) as fantasy_rank
            from player_season_fantasy
            order by fantasy_rank, full_name
            limit 50
        """, (season, min_games)).fetchall()
        return [
            {"player_id": r[0], "full_name": r[1], "season": r[2],
             "avg_fantasy_pts": r[3], "games": r[4], "fantasy_rank": r[5]}
            for r in rows
        ]


@app.get("/api/fantasy/season-totals")
def get_fantasy_season_totals(season: str | None = None):
    # Total fantasy points per player for one season. Games a player sat out add nothing to a sum,
    # so unlike the averages there is no minimum-games rule here.
    with db() as conn:
        season = resolve_season(conn, season)
        rows = conn.execute("""
            select p.player_id, p.full_name, g.season,
                   sum(pgs.fantasy_pts) as total_points, count(*) filter (where pgs.zero_minutes = false) as games
            from players as p
            join player_game_stats as pgs on pgs.player_id = p.player_id
            join games as g on g.game_id = pgs.game_id
            where g.season = %s
            group by p.player_id, p.full_name, g.season
            order by total_points desc nulls last, p.full_name
            limit 50
        """, (season,)).fetchall()
        return [
            {"player_id": r[0], "full_name": r[1], "season": r[2], "total_points": r[3], "games": r[4]}
            for r in rows
        ]


@app.get("/api/fantasy/rolling-averages")
def get_fantasy_rolling_averages(season: str | None = None):
    with db() as conn:
        season = resolve_season(conn, season)
        rows = conn.execute("""
            with average_fantasy as (
                select
                    p.player_id,
                    p.full_name,
                    g.season,
                    g.game_date,
                    avg(pgs.fantasy_pts) over (
                        partition by p.player_id
                        order by g.game_date
                        rows between 4 preceding and current row
                    ) as rolling_5_game_fantasy_avg
                from players as p
                inner join player_game_stats as pgs on pgs.player_id = p.player_id
                inner join games as g on pgs.game_id = g.game_id
                where g.season = %s
                  and pgs.zero_minutes = false
                  and g.game_date <= current_date
            ), latest_fantasy as (
                select
                    player_id,
                    full_name,
                    season,
                    game_date,
                    rolling_5_game_fantasy_avg,
                    row_number() over (
                        partition by player_id
                        order by game_date desc
                    ) as latest_game_rank
                from average_fantasy
            )
            select
                player_id,
                full_name,
                season,
                game_date,
                rolling_5_game_fantasy_avg
            from latest_fantasy
            where latest_game_rank = 1
            order by rolling_5_game_fantasy_avg desc
        """, (season,)).fetchall()
        return [
            {
                "player_id": r[0],
                "full_name": r[1],
                "season": r[2],
                "game_date": r[3],
                "rolling_5_game_fantasy_avg": r[4],
            }
            for r in rows
        ]


@app.get("/api/team_averages")
def get_team_averages(season: str | None = None):
    # Two levels: sum points per team per game, then average those per team (the grain matters).
    with db() as conn:
        season = resolve_season(conn, season)
        rows = conn.execute("""
            with team_game_points as (
                select t.team_id, t.full_name, g.game_id, sum(pgs.pts) as team_points
                from teams as t
                join player_game_stats as pgs on pgs.team_id = t.team_id
                join games as g on g.game_id = pgs.game_id
                where g.season = %s
                group by t.team_id, t.full_name, g.game_id
            )
            select
                tgp.team_id,
                tgp.full_name,
                avg(tgp.team_points) as pts_per_game,
                count(*) as games,
                rank() over (order by avg(tgp.team_points) desc) as team_rank
            from team_game_points as tgp
            group by tgp.team_id, tgp.full_name
            order by team_rank
        """, (season,)).fetchall()
        return [
            {"team_id": r[0], "full_name": r[1], "pts_per_game": r[2], "games": r[3], "team_rank": r[4]}
            for r in rows
        ]


@app.get("/api/team_player_points")
def get_highest_point_per_team(season: str | None = None):
    with db() as conn:
        season = resolve_season(conn, season)
        rows = conn.execute("""
            select p.full_name, t.full_name, pgs.pts
            from teams as t
            inner join player_game_stats as pgs on t.team_id = pgs.team_id
            inner join players as p on pgs.player_id = p.player_id
            inner join games as g on pgs.game_id = g.game_id
            where g.season = %s
            order by pgs.pts desc
            limit 10
        """, (season,)).fetchall()
        return [{"player": r[0], "team": r[1], "pts": r[2]} for r in rows]


# Accent folding so "doncic" finds "Dončić". The same letters are mapped on both sides:
# translate() in SQL for the stored names, fold() here for what the user typed.
_ACCENTED = "čćžšđéèêëėáàâäãåāíìîïóòôöõøōúùûüūñçł"
_PLAIN = "cczsd" "eeeee" "aaaaaaa" "iiii" "ooooooo" "uuuuu" "ncl"


def fold(text):
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return text.translate(str.maketrans("đøł", "dol"))


@app.get("/api/players/search")
def search_players(q: str = "", limit: int = 25):
    # Players with stats in the database. Shape matches /api/players (+ team in "pos"),
    # with "pts" = points per game this season, so the frontend list rows work unchanged.
    limit = max(1, min(limit, 100))
    needle = fold(q.strip())
    pattern = "%" + needle.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    with db() as conn:
        season = resolve_season(conn, None)
        # No search text: show the season's scoring leaders, not one-game flukes.
        min_games = 0 if needle else default_min_games(conn, season)
        rows = conn.execute("""
            with latest as (
                select distinct on (pgs.player_id) pgs.player_id, pgs.team_id
                from player_game_stats as pgs
                inner join games as g on g.game_id = pgs.game_id
                order by pgs.player_id, g.game_date desc
            ), this_season as (
                select pgs.player_id, avg(pgs.pts) as ppg, count(*) as gp
                from player_game_stats as pgs
                inner join games as g on g.game_id = pgs.game_id
                where g.season = %s
                group by pgs.player_id
            )
            select p.player_id, p.full_name, t.abbreviation, coalesce(s.ppg, 0), coalesce(s.gp, 0)
            from players as p
            inner join latest as l on l.player_id = p.player_id
            inner join teams as t on t.team_id = l.team_id
            left join this_season as s on s.player_id = p.player_id
            where translate(lower(p.full_name), %s, %s) like %s
              and coalesce(s.gp, 0) >= %s
            order by s.ppg desc nulls last, p.full_name
            limit %s
        """, (season, _ACCENTED, _PLAIN, pattern, min_games, limit)).fetchall()
        return [
            {"playerId": r[0], "playerName": r[1], "pos": r[2], "pts": round(float(r[3]), 1), "gp": r[4]}
            for r in rows
        ]


def pct(made, attempted):
    return round(made / attempted, 3) if attempted else None


@app.get("/api/players/{player_id}/season")
def get_player_season(player_id: int, season: str | None = None):
    with db() as conn:
        seasons = [r[0] for r in conn.execute("""
            select distinct g.season
            from player_game_stats as pgs
            inner join games as g on g.game_id = pgs.game_id
            where pgs.player_id = %s and g.season is not null
            order by g.season desc
        """, (player_id,)).fetchall()]
        if not seasons:
            return JSONResponse(status_code=404, content={"error": "no stats for this player"})
        if season is None or season not in seasons:
            season = seasons[0]   # newest season this player has played

        name, team = conn.execute("""
            select p.full_name, t.abbreviation
            from players as p
            inner join player_game_stats as pgs on pgs.player_id = p.player_id
            inner join games as g on g.game_id = pgs.game_id
            inner join teams as t on t.team_id = pgs.team_id
            where p.player_id = %s
            order by g.game_date desc
            limit 1
        """, (player_id,)).fetchone()

        a = conn.execute("""
            select count(*), avg(pgs.min), avg(pgs.pts), avg(pgs.reb), avg(pgs.ast), avg(pgs.stl),
                   avg(pgs.blk), avg(pgs.tov), sum(pgs.fgm), sum(pgs.fga), sum(pgs.fg3m),
                   sum(pgs.fg3a), sum(pgs.ftm), sum(pgs.fta)
            from player_game_stats as pgs
            inner join games as g on g.game_id = pgs.game_id
            where pgs.player_id = %s and g.season = %s
        """, (player_id, season)).fetchone()

        last = conn.execute("""
            select g.game_date, opp.abbreviation, pgs.is_home, pgs.wl, pgs.pts, pgs.reb, pgs.ast, pgs.min
            from player_game_stats as pgs
            inner join games as g on g.game_id = pgs.game_id
            left join lateral (
                select t.abbreviation
                from player_game_stats as o
                inner join teams as t on t.team_id = o.team_id
                where o.game_id = pgs.game_id and o.team_id <> pgs.team_id
                limit 1
            ) as opp on true
            where pgs.player_id = %s and g.season = %s
            order by g.game_date desc
            limit 5
        """, (player_id, season)).fetchall()

        through = conn.execute("select max(game_date) from games").fetchone()[0]

    one = lambda x: round(float(x), 1)
    return {
        "playerId": player_id,
        "playerName": name,
        "team": team,
        "season": season,
        "seasons": seasons,
        "through": through.isoformat() if through else None,
        "averages": {
            "gp": a[0], "min": one(a[1]), "pts": one(a[2]), "reb": one(a[3]), "ast": one(a[4]),
            "stl": one(a[5]), "blk": one(a[6]), "tov": one(a[7]),
            "fgPct": pct(a[8], a[9]), "fg3Pct": pct(a[10], a[11]), "ftPct": pct(a[12], a[13]),
        },
        "lastGames": [
            {"date": r[0].isoformat(), "opponent": r[1], "home": r[2], "result": r[3],
             "pts": r[4], "reb": r[5], "ast": r[6], "min": r[7]}
            for r in last
        ],
    }


@app.get("/api/players/{player_id}")
def get_player(player_id: int):
    try:
        boxes = get_slate_boxes()

        player = next(
            (p for b in boxes
               for p in b["game"]["homeTeam"]["players"] + b["game"]["awayTeam"]["players"]
               if p["personId"] == player_id),
            None,
        )

        if player is None:
            return JSONResponse(status_code=404, content={"error": "player not found"})

        s = player["statistics"]
        return {
            "playerId": player["personId"],
            "playerName": player["name"],
            "position": player.get("position"),
            "jerseyNum": player["jerseyNum"],
            "starter": player["starter"] == "1",
            "played": player["played"] == "1",
            "minutes": s["minutes"],
            "points": s["points"],
            "rebounds": s["reboundsTotal"],
            "assists": s["assists"],
            "steals": s["steals"],
            "blocks": s["blocks"],
            "turnovers": s["turnovers"],
            "fieldGoals": f'{s["fieldGoalsMade"]}/{s["fieldGoalsAttempted"]}',
            "threePointers": f'{s["threePointersMade"]}/{s["threePointersAttempted"]}',
            "freeThrows": f'{s["freeThrowsMade"]}/{s["freeThrowsAttempted"]}',
            "plusMinus": s["plusMinusPoints"],
        }
    except Exception:
        return bad_gateway()


    
