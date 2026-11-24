from nba_api.stats.endpoints import LeagueGameLog
import os 

def extract_games(season):


    log = LeagueGameLog(season=season, player_or_team_abbreviation="P")
    return log.get_data_frames()[0] 

if __name__ == "__main__":
    season = "2025-26"
    folder = "season_exports"
    file_path = f"{folder}/games_{season}.csv"

    data = extract_games(season)
    print(data.head())
    print(data.columns.to_list())
    print(data.shape)


    os.makedirs(folder, exist_ok=True)
    data.to_csv(file_path, index=False)