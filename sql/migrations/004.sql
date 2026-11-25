select p.full_name, pgs.pts, pgs.game_id
from player_game_stats as pgs
inner join players as p on pgs.player_id = p.player_id 
where pts > 25
order by pts desc
limit 10;

select t.team_id, pgs.team_id, pgs.pts, t.full_name, p.player_id
from teams as t
inner join player_game_stats as pgs on t.team_id = pgs.team_id
inner join players as p on pgs.player_id = p.player_id
order by pgs.pts desc
limit 10;



