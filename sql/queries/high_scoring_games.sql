select p.full_name, pgs.pts, pgs.game_id
from player_game_stats as pgs
inner join players as p on pgs.player_id = p.player_id
where pts > 25
order by pts desc
limit 10;
