import os

import pandas as pd
import numpy as np
import sys

# --- Load ---
# One season per run: `python transform.py 2026-27` reads season_exports/games_2026-27.csv.
# (Old seasons are already in the database; the load step upserts, so rerunning is safe.)
season = sys.argv[1] if len(sys.argv) > 1 else "2026-27"
df = pd.read_csv(f"season_exports/games_{season}.csv", dtype={"GAME_ID": str})
df.columns = df.columns.str.lower()
teams_df = pd.read_csv("season_exports/teams.csv")
players_df = pd.read_csv("season_exports/players.csv")


# The game log already has team_name and player_name; drop them so the merged
# full_name columns below don't create duplicate column names.
df = df.drop(columns=["team_name", "player_name"])

df = df.merge(teams_df[["id", "full_name"]], left_on="team_id", right_on="id", suffixes=("", "_team"))

df = df.merge(players_df[["id", "full_name"]], left_on="player_id", right_on="id", suffixes=("", "_player"))

# merges leave duplicate id columns and ambiguous full_name columns behind; clean those up.
df = df.rename(columns={"full_name": "team_name", "full_name_player": "player_name"})
df = df.drop(columns=["id", "id_player"])

# --- Standardize / derive columns ---
# season_id encodes the season's starting year in its last 4 digits (22025 -> 2025,
# meaning the 2025-26 season). A fixed dict only covered one season; this formula
# works for any season, which backfilling multiple seasons needs.
start_year = df["season_id"].astype(str).str[-4:].astype(int)
df["season"] = start_year.astype(str) + "-" + ((start_year + 1) % 100).astype(str).str.zfill(2)

df["game_date"] = pd.to_datetime(df["game_date"])

df["is_home"] = df["matchup"].str.contains("vs", regex=False)
df["opponent"] = df["matchup"].str[-3:]

# Kept on purpose: MIN is rounded, so 0 means under ~30s, not a DNP.
df["zero_minutes"] = df["min"] == 0

# np.where(condition, value_if_true, value_if_false). With 0 attempts there is no
# percentage, so it stays NaN (null), not 0; averaging zeros in would skew results later.
df["fg3_pct"] = np.where(df["fg3a"] > 0, df["fg3m"] / df["fg3a"], np.nan)
df["ft_pct"] = np.where(df["fta"] > 0, df["ftm"] / df["fta"], np.nan)
df["fg_pct"] = np.where(df["fga"] > 0, df["fgm"] / df["fga"], np.nan)

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
df.to_csv(f"processed/games_{season}.csv", index=False)

games = df[["game_id", "game_date", "season"]].drop_duplicates()
games.to_csv("processed/games.csv", index=False)
print(len(games))   # games in this season so far

# Only the player_game_stats table's columns, in the same order as its CREATE TABLE,
# so \copy can load the file with no column mapping surprises.
stats = df[[
    "game_id", "player_id", "team_id", "is_home", "zero_minutes", "wl", "min",
    "fgm", "fga", "fg3m", "fg3a", "ftm", "fta",
    "oreb", "dreb", "reb", "ast", "stl", "blk", "tov", "pf", "pts", "plus_minus",
    "fg_pct", "fg3_pct", "ft_pct", "fantasy_pts",
]]
stats.to_csv("processed/player_game_stats.csv", index=False)
print(len(stats))   # player-game rows in this season so far
