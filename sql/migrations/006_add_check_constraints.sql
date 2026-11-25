ALTER TABLE player_game_stats ADD CONSTRAINT pts_nonnegative CHECK (pts >= 0);

ALTER TABLE player_game_stats ADD CONSTRAINT stats_nonnegative CHECK (
  fgm >= 0 AND fga >= 0 AND fg3m >= 0 AND fg3a >= 0 AND ftm >= 0 AND fta >= 0 AND
  oreb >= 0 AND dreb >= 0 AND reb >= 0 AND ast >= 0 AND stl >= 0 AND blk >= 0 AND tov >= 0 AND pf >= 0 AND min >= 0
);

ALTER TABLE player_game_stats ADD CONSTRAINT makes_le_attempts
  CHECK (fgm <= fga AND fg3m <= fg3a AND ftm <= fta);

ALTER TABLE player_game_stats ADD CONSTRAINT reb_equals_oreb_plus_dreb
  CHECK (reb = oreb + dreb);

ALTER TABLE player_game_stats ADD CONSTRAINT pct_in_range CHECK (
  (fg_pct IS NULL OR (fg_pct >= 0 AND fg_pct <= 1)) AND
  (fg3_pct IS NULL OR (fg3_pct >= 0 AND fg3_pct <= 1)) AND
  (ft_pct IS NULL OR (ft_pct >= 0 AND ft_pct <= 1))
);

ALTER TABLE team_game_stats ADD CONSTRAINT stats_nonnegative CHECK (
  pts >= 0 AND fgm >= 0 AND fga >= 0 AND fg3m >= 0 AND fg3a >= 0 AND ftm >= 0 AND fta >= 0 AND
  oreb >= 0 AND dreb >= 0 AND reb >= 0 AND ast >= 0 AND stl >= 0 AND blk >= 0 AND tov >= 0 AND pf >= 0
);

ALTER TABLE team_game_stats ADD CONSTRAINT makes_le_attempts
  CHECK (fgm <= fga AND fg3m <= fg3a AND ftm <= fta);

ALTER TABLE team_game_stats ADD CONSTRAINT reb_equals_oreb_plus_dreb
  CHECK (reb = oreb + dreb);
