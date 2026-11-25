select t.full_name, avg(pgs.pts)
from teams as t
inner join player_game_stats as pgs on t.team_id = pgs.team_id
group by t.full_name
order by avg(pgs.pts) desc;
