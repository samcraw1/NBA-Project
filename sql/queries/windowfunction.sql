select
    p.player_id,
    p.full_name,
    pgs.game_id,
    pgs.pts,
    rank() over (
        partition by pgs.game_id
        order by pgs.pts desc
    ) as game_rank
from player_game_stats as pgs
inner join players as p on p.player_id = pgs.player_id;


select player_id, game_id, pts,
      avg(pts) over (
          partition by player_id
          order by game_date
          rows between 4 preceding and current
  row
      ) as rolling_5game_avg
  from player_game_stats
  join games using (game_id);
