import os

import pandas as pd
import numpy as np

# --- Load ---
df = pd.read_csv("season_exports/games_2025-26.csv", dtype={"GAME_ID": str})
df.columns = df.columns.str.lower()
teams_df = pd.read_csv("season_exports/teams.csv")
players_df = pd.read_csv("season_exports/players.csv")


df = df.merge(teams_df[["id", "full_name"]], left_on="team_id", right_on="id", suffixes=("", "_team"))

df = df.merge(players_df[["id", "full_name"]], left_on="player_id", right_on="id", suffixes=("", "_player"))

# merges leave duplicate id columns and ambiguous full_name columns behind; clean those up.
df = df.rename(columns={"full_name": "team_name", "full_name_player": "player_name"})
df = df.drop(columns=["id", "id_player"])

# --- Standardize / derive columns ---
# .map() looks up each value in the dict and replaces it; season_id -> readable season string.
df["season"] = df["season_id"].map({22025: "2025-26"})

df["game_date"] = pd.to_datetime(df["game_date"])

df["is_home"] = df["matchup"].str.contains("vs", regex=False)
df["opponent"] = df["matchup"].str[-3:]

# Kept on purpose: MIN is rounded, so 0 means under ~30s, not a DNP.
df["zero_minutes"] = df["min"] == 0

# np.where(condition, value_if_true, value_if_false) avoids NaN/inf on 0 attempts.
df["fg3_pct"] = np.where(df["fg3a"] > 0, df["fg3m"] / df["fg3a"], 0)
df["ft_pct"] = np.where(df["fta"] > 0, df["ftm"] / df["fta"], 0)
df["fg_pct"] = np.where(df["fga"] > 0, df["fgm"] / df["fga"], 0)

df = df.drop(columns=["video_available", "matchup"])

# --- Sanity checks ---
print(df[["opponent", "is_home"]].head(6))
print(df[["fg3_pct", "fg3a", "fg3m"]])

assert not df.duplicated(["game_id", "player_id"]).any(), "duplicate player-game rows"
assert df[["game_id", "player_id", "team_id", "pts"]].notna().all().all(), "nulls in key columns"
assert (df["reb"] == df["oreb"] + df["dreb"]).all(), "rebounds don't add up"
assert (df.groupby("game_id")["team_id"].nunique() == 2).all(), "a game doesn't exactly have 2 teams"

# --- Write ---
os.makedirs("processed", exist_ok=True)
df.to_csv("processed/games_2025-26.csv", index=False)
