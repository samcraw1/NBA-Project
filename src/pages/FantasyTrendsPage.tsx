import { endpoints } from "../api";
import { PlayerRows } from "../components/PlayerRows";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { SectionHeader } from "../components/SectionHeader";
import { useFetch } from "../hooks/useFetch";
import type { FantasyTrendLeader } from "../types";

const SEASON = "2026-27";

export function FantasyTrendsPage({ onSelectPlayer }: { onSelectPlayer: (playerId: number) => void }) {
  const trends = useFetch<FantasyTrendLeader[]>(endpoints.fantasyLeaders(SEASON));

  let content;
  if (trends.loading) {
    content = <SkeletonRows count={6} />;
  } else if (trends.error) {
    content = (
      <ErrorState
        message={`Couldn't load ${SEASON} fantasy trends from the database.`}
        onRetry={trends.reload}
      />
    );
  } else if (!trends.data?.length) {
    content = <EmptyState message={`No fantasy game stats are available for ${SEASON} yet.`} />;
  } else {
    content = (
      <PlayerRows
        players={trends.data.map((player, i) => ({
          playerId: player.player_id,
          playerName: player.full_name,
          pos: `Through ${player.game_date}`,
          pts: Number(Number(player.rolling_5_game_fantasy_avg).toFixed(1)),
          rank: i + 1,
        }))}
        onSelect={onSelectPlayer}
        showRank
      />
    );
  }

  return (
    <section className="panel" aria-labelledby="fantasy-trends-heading" aria-busy={trends.loading}>
      <p className="crumbs"><a className="link" href="#/">← Scores</a></p>
      <SectionHeader id="fantasy-trends-heading" title={`${SEASON} fantasy points · rolling 5-game average`} />
      <p className="lead">
        Each player appears once, using their latest rolling average from games played this season.
      </p>
      {content}
    </section>
  );
}
