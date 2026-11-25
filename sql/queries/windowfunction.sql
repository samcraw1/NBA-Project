select p.full_name, pgs.pts, pgs.game_id,
      rank() over (order by pgs.pts desc) as
  pts_rank
  from player_game_stats as pgs
  inner join players as p on pgs.player_id =
  p.player_id;


select player_id, game_id, pts,
      avg(pts) over (
          partition by player_id
          order by game_date
          rows between 4 preceding and current
  row
      ) as rolling_5game_avg
  from player_game_stats
  join games using (game_id);