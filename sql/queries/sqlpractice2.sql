with team_game_points as (
    select t.team_id, t.full_name, g.game_id, sum(pgs.pts) as team_points
from teams as t
join player_game_stats as pgs on pgs.team_id = t.team_id
join games as g on g.game_id = pgs.game_id
group by t.team_id,t.full_name, g.game_id
)
select 
    tgp.team_id,
    tgp.full_name,
    avg(team_points)
from team_game_points as tgp
group by tgp.team_id, tgp.full_name;

