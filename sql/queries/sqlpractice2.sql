select p.player_id, p.full_name, g.season, sum(pgs.fantasy_pts) as total_points
from players as p
join player_game_stats as pgs on pgs.player_id = p.player_id
join games as g on g.game_id = pgs.game_id
where g.season = '2026-27';

group by p.player_id, p.full_name, g.season;
