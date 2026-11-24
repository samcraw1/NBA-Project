from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from nba_api.live.nba.endpoints import scoreboard, boxscore, playbyplay


app = FastAPI()


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

