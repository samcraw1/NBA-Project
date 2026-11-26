select t.full_name, avg(game_pts) as pts_per_game
from (
    select team_id, game_id, sum(pts) as game_pts
    from player_game_stats
    group by team_id, game_id
) as tg
inner join teams as t on t.team_id = tg.team_id
group by t.full_name
order by pts_per_game desc;