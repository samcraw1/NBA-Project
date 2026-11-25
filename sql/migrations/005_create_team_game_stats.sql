create table team_game_stats (
    game_id TEXT,
    team_id int  ,
    wl  TEXT,
    pts INTEGER,
    fgm INTEGER,
    fga INTEGER,
    fg3m INTEGER,
    fg3a INTEGER,
    ftm INTEGER,
    fta INTEGER,
    oreb INTEGER,
    dreb INTEGER,
    reb INTEGER,
    ast INTEGER,
    stl INTEGER,
    blk INTEGER,
    tov INTEGER,
    pf INTEGER,
    plus_minus INTEGER,
     PRIMARY KEY (game_id, team_id)

);

ALTER TABLE team_game_stats ADD CONSTRAINT team_game_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(game_id);
ALTER TABLE team_game_stats ADD CONSTRAINT team_game_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(team_id);