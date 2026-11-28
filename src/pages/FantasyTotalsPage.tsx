import { endpoints } from "../api";
import { PlayerRows } from "../components/PlayerRows";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { SectionHeader } from "../components/SectionHeader";
import { useFetch } from "../hooks/useFetch";
import type { FantasySeasonTotal } from "../types";

export function FantasyTotalsPage({ onSelectPlayer }: { onSelectPlayer: (playerId: number) => void }) {
  // Newest season loaded in the database, same as the other Analytics pages.
  const seasons = useFetch<string[]>(endpoints.seasons);
  const season = seasons.data?.[0];
  const totals = useFetch<FantasySeasonTotal[]>(season ? endpoints.fantasySeasonTotals(season) : null);

  let content;
  if (seasons.loading || totals.loading) {
    content = <SkeletonRows count={6} />;
  } else if (seasons.error || totals.error) {
    content = (
      <ErrorState
        message="Couldn't load fantasy totals from the database."
        onRetry={seasons.error ? seasons.reload : totals.reload}
      />
    );
  } else if (!totals.data?.length) {
    content = <EmptyState message="No fantasy totals for this season yet." />;
  } else {
    content = (
      <PlayerRows
        players={totals.data.map((player, i) => ({
          playerId: player.player_id,
          playerName: player.full_name,
          pos: `${player.games} games`,
          pts: Number(Number(player.total_points).toFixed(0)),
          rank: i + 1,
        }))}
        onSelect={onSelectPlayer}
        showRank
      />
    );
  }

  return (
    <section className="panel" aria-labelledby="fantasy-totals-heading" aria-busy={totals.loading}>
      <p className="crumbs"><a className="link" href="#/analytics">← Analytics</a></p>
      <SectionHeader id="fantasy-totals-heading" title={`Fantasy totals${season ? `, ${season}` : ""}`} />
      <p className="lead">
        Total fantasy points each player has scored this season, so players with more games played rank higher.
      </p>
      {content}
    </section>
  );
}
