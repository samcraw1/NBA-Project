from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from nba_api.live.nba.endpoints import scoreboard, boxscore, playbyplay
import os

import psycopg


app = FastAPI()


def db():
    # DATABASE_URL points at RDS (or anything else); with it unset we use the local database.
    return psycopg.connect(os.environ.get("DATABASE_URL", "dbname=nba_project"))


def bad_gateway():
    return JSONResponse(status_code=502, content={"error": "could not reach NBA.com"})


@app.get("/api/games")
def get_games():
    try:
        games = scoreboard.ScoreBoard().get_dict()["scoreboard"]["games"]
        return [
            {
                "gameId": g["gameId"],
                "status": g["gameStatusText"].strip(),
                "away": {"teamId": g["awayTeam"]["teamId"], "tricode": g["awayTeam"]["teamTricode"], "score": g["awayTeam"]["score"]},
                "home": {"teamId": g["homeTeam"]["teamId"], "tricode": g["homeTeam"]["teamTricode"], "score": g["homeTeam"]["score"]},

            }
            for g in games
        ]
    except Exception:
        return bad_gateway()


@app.get("/api/players")
def get_players():
    try:
        games = scoreboard.ScoreBoard().get_dict()["scoreboard"]["games"]
        game_ids = [g["gameId"] for g in games]

        with ThreadPoolExecutor() as pool:
            boxes = list(pool.map(lambda gid: boxscore.BoxScore(gid).get_dict(), game_ids))

        return [
            {"playerId": p["personId"], "playerName": p["name"], "pts": p["statistics"]["points"]}
            for b in boxes
            for p in b["game"]["homeTeam"]["players"] + b["game"]["awayTeam"]["players"]
        ]
    except Exception:
        return bad_gateway()


@app.get("/api/games/{gameId}")
def get_game(gameId: str):
    try:
        box = boxscore.BoxScore(gameId).get_dict()
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
    except Exception:
        return bad_gateway()


@app.get("/api/games/{game_id}/plays")
def get_plays(game_id: str):
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

@app.get("/api/averages")
def get_averages():
    with db() as conn:
            rows = conn.execute("""
            select p.full_name, avg(pgs.pts)
                    from players as p
                    inner join player_game_stats as pgs on p.player_id = pgs.player_id
                    group by p.player_id
                    having count(*) >= 20
                    order by avg(pgs.pts) desc
                    limit 10;
                    """
                         ).fetchall()
            return [{"full_name": r[0], "average_points": r[1]} for r in rows]

@app.get("/api/team_averages")
def get_team_averages():
    with db() as conn:
        rows = conn.execute("""
                select t.full_name, avg(game_pts) as pts_per_game
                    from (
                        select team_id, game_id, sum(pts) as game_pts
                        from player_game_stats
                        group by team_id, game_id
                    ) as tg
                    inner join teams as t on t.team_id = tg.team_id
                    group by t.full_name
                    order by pts_per_game desc;
                """).fetchall()
        return [{"full_name": r[0], "pts_per_game": r[1]}for r in rows]

@app.get("/api/team_player_points")
def get_highest_point_per_team():
    with db() as conn:
        rows = conn.execute("""select p.full_name, t.full_name,pgs.pts
                        from teams as t
                        inner join player_game_stats as pgs on t.team_id = pgs.team_id
                        inner join players as p on pgs.player_id = p.player_id
                        order by pgs.pts desc
                        limit 10;
                            """

        ).fetchall()
        return [{"player": r[0], "team": r[1], "pts": r[2]}for r in rows]





@app.get("/api/players/{player_id}")
def get_player(player_id: int):
    try:
        games = scoreboard.ScoreBoard().get_dict()["scoreboard"]["games"]
        with ThreadPoolExecutor() as pool:
            boxes = list(pool.map(lambda g: boxscore.BoxScore(g["gameId"]).get_dict(), games))

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


    
