import pandas as pd

from nba_api.stats.endpoints import LeagueGameLog
from nba_api.stats.static import players
from nba_api.stats.static import teams
import os 
import time

def extract_games(season, max_retries = 3):
    # Hits stats.nba.com live; this sandbox's network can't reach it (times out).
    # Run this script on your home machine to actually pull game data.
    for attempt in range(max_retries):
        try:
            log = LeagueGameLog(season=season, player_or_team_abbreviation="P")
            return log.get_data_frames()[0] 
        except Exception as event:
            print(f"attempt {attempt+1} failed: {event}")
            time.sleep(5)

    raise RuntimeError(f"extract_games failed after{ max_retries} attempts")
       

def extract_teams(max_retries = 3):
    try:
        return pd.DataFrame(teams.get_teams())
    except Exception as event:
        print(f"failed to extract players: {event}")
        raise RuntimeError(f"extract_teams failed after {max_retries}")

def extract_players(max_retries =3):
    try:
        return pd.DataFrame(players.get_players())
    except Exception as event:
        print(f"Failed to extract players: {event}")
        raise RuntimeError(f"extract_players failed after { max_retries}")


    
if __name__ == "__main__":
    
   
    folder = "season_exports" 
    os.makedirs(folder, exist_ok=True)
    seasons = ["2023-24", "2024-25", "2025-26"]
    for season in seasons:
        games_df = extract_games(season)
        games_df.to_csv(f"season_exports/games_{season}.csv", index=False)
    playerdata = extract_players()
    

    
    teamdata = extract_teams()


    
   
    teamdata.to_csv(f"{folder}/teams.csv", index= False)
    playerdata.to_csv(f"{folder}/players.csv", index = False)
    


    