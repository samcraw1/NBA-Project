import boto3



s3 = boto3.client("s3")

season = "2026-27"
bucket = "nba-project-data-506726968427"


files = [
    (f"season_exports/games_{season}.csv", f"raw/games_{season}.csv"),
    (f"processed/games_{season}.csv", f"processed/games_{season}/games_{season}.csv"),
    ("processed/games.csv", f"processed/games/games_{season}.csv"),
    ("processed/player_game_stats.csv", f"processed/player_game_stats/player_game_stats_{season}.csv"),
]



for filename , key in files:
    s3.upload_file(
        Filename = filename ,
        Bucket = bucket,
        Key = key,
    )

