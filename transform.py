
import os

import pandas as pd


##basically how do i change the name like a map?
df = pd.read_csv("season_exports/games_2025-26.csv", dtype={"GAME_ID": str})

df.columns = df.columns.str.lower()

df["season"] = df["season_id"].map({22025: "2025-26"})

df["fg3_pct"] = df["fg3m"]/ df["fg3a"]
df["ft_pct"] = df["ftm"]/ df["fta"]
df["fg_pct"] = df["fgm"]/ df["fga"]

df["is_home"] = df["matchup"].str.contains("vs", regex=False)
df["opponent"] = df["matchup"].str[-3:]

# Kept on purpose: MIN is rounded, so 0 means under ~30s, not a DNP.
df["zero_minutes"] = df["min"] == 0

df = df.drop(columns=["video_available", "matchup"])







df["game_date"] = pd.to_datetime(df["game_date"])


print(df[["opponent", "is_home"]].head(6))
print(df[["fg3_pct", "fg3a", "fg3m"]])


assert not df.duplicated(["game_id", "player_id"]).any(), "duplicate player-game rows"

assert df[["game_id", "player_id", "team_id", "pts"]].notna().all().all(), "nulls in key columns"

assert (df["reb"] == df["oreb"] + df["dreb"]).all(), "rebounds don't add up"

assert (df.groupby("game_id")["team_id"].nunique() == 2).all(), "a game doesn't exactly have 2 teams"

os.makedirs("processed", exist_ok=True)

df.to_csv("processed/games_2025-26.csv", index=False)