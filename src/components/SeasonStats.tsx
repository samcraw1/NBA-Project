import { endpoints } from "../api";
import { useFetch } from "../hooks/useFetch";
import type { TeamAverage, TopGame } from "../types";
import { EmptyState, ErrorState, Loading } from "./StateMessage";

// Season stats served from PostgreSQL (not the live NBA.com feed), so they render on any day.
export function SeasonStats() {
  // The backend defaults to the newest season in the database; /api/seasons tells us which one that is.
  const seasons = useFetch<string[]>(endpoints.seasons);
  const season = seasons.data?.[0];
  return (
    <div className="season-stats">
      <TopGames season={season} />
      <TeamAverages season={season} />
    </div>
  );
}

function TopGames({ season }: { season?: string }) {
  const { data, loading, error, reload } = useFetch<TopGame[]>(endpoints.topGames);
  return (
    <>
      <h3 className="card-subtitle">Top scoring games{season ? `, ${season}` : ""}</h3>
      {loading && <Loading label="Loading season stats" />}
      {error && <ErrorState message="Couldn't load season stats from the database." onRetry={reload} />}
      {data && data.length === 0 && <EmptyState message="No games in the database yet." />}
      {data && data.length > 0 && (
        <ul className="rows">
          {data.map((g, i) => (
            <li className="row" key={`${g.player}-${i}`}>
              <span className="rank">{i + 1}</span>
              <span className="info">
                <span className="name-line">
                  {g.player}
                  <span className="pos">{g.team}</span>
                </span>
                <span className="track" aria-hidden="true">
                  <span className="bar" style={{ width: `${(g.pts / data[0].pts) * 100}%` }} />
                </span>
              </span>
              <span className="pts">
                {g.pts}
                <span className="sr-only"> points</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TeamAverages({ season }: { season?: string }) {
  const { data, loading, error, reload } = useFetch<TeamAverage[]>(endpoints.teamAverages);
  return (
    <>
      <h3 className="card-subtitle">Team points per game{season ? `, ${season}` : ""}</h3>
      {loading && <Loading label="Loading team averages" />}
      {error && <ErrorState message="Couldn't load team averages from the database." onRetry={reload} />}
      {data && data.length > 0 && (
        <ul className="rows">
          {data.slice(0, 10).map((t, i) => (
            <li className="row" key={t.full_name}>
              <span className="rank">{i + 1}</span>
              <span className="info">
                <span className="name-line">{t.full_name}</span>
                <span className="track" aria-hidden="true">
                  <span className="bar" style={{ width: `${(t.pts_per_game / data[0].pts_per_game) * 100}%` }} />
                </span>
              </span>
              <span className="pts">
                {t.pts_per_game.toFixed(1)}
                <span className="sr-only"> points per game</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
