select p.full_name, avg(pgs.pts)
from players as p
inner join player_game_stats as pgs on p.player_id = pgs.player_id
group by p.player_id
order by avg(pgs.pts) desc
limit 10;
