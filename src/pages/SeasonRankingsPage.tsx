import { endpoints } from "../api";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { SectionHeader } from "../components/SectionHeader";
import { useFetch } from "../hooks/useFetch";
import type { SeasonScoringLeader } from "../types";

const SEASON = "2026-27";

export function SeasonRankingsPage({ onSelectPlayer }: { onSelectPlayer: (playerId: number) => void }) {
  const leaders = useFetch<SeasonScoringLeader[]>(endpoints.seasonAverages(SEASON));

  let content;
  if (leaders.loading) {
    content = <SkeletonRows count={5} />;
  } else if (leaders.error) {
    content = (
      <ErrorState
        message={`Couldn't load ${SEASON} scoring rankings from the database.`}
        onRetry={leaders.reload}
      />
    );
  } else if (!leaders.data?.length) {
    content = <EmptyState message={`No qualified scoring leaders for ${SEASON} yet.`} />;
  } else {
    content = (
      <ul className="rows">
        {leaders.data.map((player, i) => {
          const ppg = Number(player.average_points);
          return (
            <li className="row" key={player.player_id ?? player.full_name}>
              <span className="rank">{player.average_rank ?? i + 1}</span>
              <span className="info">
                <span className="name-line">
                  {player.player_id ? (
                    <button type="button" className="player-link" onClick={() => onSelectPlayer(player.player_id!)}>
                      {player.full_name}
                    </button>
                  ) : player.full_name}
                </span>
                <span className="track" aria-hidden="true">
                  <span className="bar" style={{ width: `${(ppg / Number(leaders.data![0].average_points)) * 100}%` }} />
                </span>
              </span>
              <span className="pts">{ppg.toFixed(1)}<span className="sr-only"> points per game</span></span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="panel" aria-labelledby="season-rankings-heading" aria-busy={leaders.loading}>
      <p className="crumbs"><a className="link" href="#/analytics">← Analytics</a></p>
      <SectionHeader id="season-rankings-heading" title={`${SEASON} scoring rankings`} />
      <p className="lead">Players ranked by points per game. Players must meet the minimum games threshold.</p>
      {content}
    </section>
  );
}
