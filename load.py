import psycopg2
import pandas as pd


def get_connection():
    return psycopg2.connect(dbname="nba_project")


def load_teams(conn, teams_df):
    curr = conn.cursor()
    for _, row in teams_df.iterrows():
        curr.execute("""
            insert into teams (team_id, full_name, abbreviation, nickname, city, state, year_founded)
            values (%s, %s, %s, %s, %s, %s, %s)
            on conflict (team_id) do update set
                full_name = excluded.full_name,
                abbreviation = excluded.abbreviation,
                nickname = excluded.nickname,
                city = excluded.city,
                state = excluded.state,
                year_founded = excluded.year_founded
        """, (row["id"], row["full_name"],row["abbreviation"], row["nickname"],
              row["city"], row["state"], row["year_founded"]))
    conn.commit()
    curr.close()

def load_players(conn, players_df):
    curr = conn.cursor()
    for _, row in players_df.iterrows():
        curr.execute("""
            insert into players (player_id, full_name, first_name, last_name, is_active)
            values (%s, %s, %s, %s, %s)
            on conflict (player_id) do update set
                player_id = excluded.player_id,
                full_name = excluded.full_name,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                is_active = excluded.is_active
               
        """, (row["id"], row["full_name"],row["first_name"], row["last_name"],
              row["is_active"]))
    conn.commit()
    curr.close()


def load_games(conn, games_df):
    curr = conn.cursor()
    for _, row in games_df.iterrows():
        curr.execute("""
            insert into games (game_id, game_date, season)
            values (%s, %s, %s)
            on conflict (game_id) do update set
                game_date = excluded.game_date,
                season = excluded.season
        """, (row["game_id"], row["game_date"], row["season"]))
    conn.commit()
    curr.close()


def load_player_game_stats(conn, stats_df):
    curr = conn.cursor()
    for _, row in stats_df.iterrows():
        curr.execute("""
            insert into player_game_stats (
                game_id, player_id, team_id, is_home, zero_minutes, wl, min,
                fgm, fga, fg3m, fg3a, ftm, fta,
                oreb, dreb, reb, ast, stl, blk, tov, pf, pts, plus_minus,
                fg_pct, fg3_pct, ft_pct, fantasy_pts
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (game_id, player_id) do update set
                team_id = excluded.team_id,
                is_home = excluded.is_home,
                zero_minutes = excluded.zero_minutes,
                wl = excluded.wl,
                min = excluded.min,
                fgm = excluded.fgm,
                fga = excluded.fga,
                fg3m = excluded.fg3m,
                fg3a = excluded.fg3a,
                ftm = excluded.ftm,
                fta = excluded.fta,
                oreb = excluded.oreb,
                dreb = excluded.dreb,
                reb = excluded.reb,
                ast = excluded.ast,
                stl = excluded.stl,
                blk = excluded.blk,
                tov = excluded.tov,
                pf = excluded.pf,
                pts = excluded.pts,
                plus_minus = excluded.plus_minus,
                fg_pct = excluded.fg_pct,
                fg3_pct = excluded.fg3_pct,
                ft_pct = excluded.ft_pct,
                fantasy_pts = excluded.fantasy_pts
        """, (
            row["game_id"], row["player_id"], row["team_id"], row["is_home"], row["zero_minutes"], row["wl"], row["min"],
            row["fgm"], row["fga"], row["fg3m"], row["fg3a"], row["ftm"], row["fta"],
            row["oreb"], row["dreb"], row["reb"], row["ast"], row["stl"], row["blk"], row["tov"], row["pf"], row["pts"], row["plus_minus"],
            row["fg_pct"], row["fg3_pct"], row["ft_pct"], row["fantasy_pts"],
        ))
    conn.commit()
    curr.close()


if __name__ == "__main__":
    conn = get_connection()
    teams_df = pd.read_csv("season_exports/teams.csv")
    load_teams(conn, teams_df)
    players_df = pd.read_csv("season_exports/players.csv")
    load_players(conn, players_df)
    games_df = pd.read_csv("processed/games.csv")
    load_games(conn, games_df)
    stats_df = pd.read_csv("processed/player_game_stats.csv")
    load_player_game_stats(conn, stats_df)
    conn.close()

