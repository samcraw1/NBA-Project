with average_ppg as(
    
    select p.player_id, p.full_name,g.season, avg(pgs.pts) as ppg
from players as p
join player_game_stats as pgs on pgs.player_id = p.player_id
join games as g on pgs.game_id = g.game_id
group by p.player_id, p.full_name, g.season
order by  g.season, p.full_name)
select 
    player_id, 
    full_name, 
    season, 
rank() over(partition by season order by ppg desc) as average_rank
from average_ppg;




with average_fantasy as(
    
    select p.player_id, p.full_name, g.season, g.game_date, 
    avg(pgs.fantasy_pts) OVER(
       PARTITION BY p.player_id
       ORDER BY g.game_date
       rows between 4 preceding and current row
    ) as rolling_5_game_fantasy_avg 
from players as p
join player_game_stats as pgs on pgs.player_id = p.player_id
join games as g on pgs.game_id = g.game_id
where g.season = '2026-27' AND pgs.zero_minutes = FALSE
and g.game_date <= CURRENT_DATE
), latest_fantasy as (
    select
        player_id,
        full_name,
        season,
        game_date,
        rolling_5_game_fantasy_avg,
        row_number() over (
            partition by player_id
            order by game_date desc
        ) as latest_game_rank
    from average_fantasy
)
select 
    player_id, 
    full_name, 
    season,
    game_date,
    rolling_5_game_fantasy_avg
from latest_fantasy
where latest_game_rank = 1;



with average_fantasy as(
    
    select p.player_id, p.full_name,g.season, avg(pgs.fantasy_pts) as average_fantasy
from players as p
join player_game_stats as pgs on pgs.player_id = p.player_id
join games as g on pgs.game_id = g.game_id
group by p.player_id, p.full_name, g.season
order by  g.season, p.full_name)
select 
    player_id, 
    full_name, 
    season, 
rank() over(partition by season order by average_fantasy desc) as average_fantasy_rank
from average_fantasy;











