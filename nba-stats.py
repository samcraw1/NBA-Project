from nba_api.live.nba.endpoints import scoreboard


games = scoreboard.ScoreBoard().get_dict()["scoreboard"]["games"]

print(games)