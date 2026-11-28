with player_season_fantasy as (
    select p.player_id, p.full_name, g.season, avg(pgs.fantasy_pts) as avg_fantasy_pts,
from players as p
join player_game_stats as pgs on pgs.player_id = p.player_id
join games as g on g.game_id = pgs.game_id
group by p.player_id, p.full_name, g.season
)
select 
    player_id,
    full_name,
    season,
    avg_fantasy_pts,
rank() over (
    partition by season 
    order by avg_fantasy_pts desc
    ) as fantasy_rank
from player_season_fantasy;