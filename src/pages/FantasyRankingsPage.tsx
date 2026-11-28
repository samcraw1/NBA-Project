import { endpoints } from "../api";
import { PlayerRows } from "../components/PlayerRows";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { SectionHeader } from "../components/SectionHeader";
import { useFetch } from "../hooks/useFetch";
import type { FantasySeasonLeader } from "../types";

export function FantasyRankingsPage({ onSelectPlayer }: { onSelectPlayer: (playerId: number) => void }) {
  // Newest season loaded in the database, same as the other Analytics pages.
  const seasons = useFetch<string[]>(endpoints.seasons);
  const season = seasons.data?.[0];
  const rankings = useFetch<FantasySeasonLeader[]>(season ? endpoints.fantasySeasonRankings(season) : null);

  let content;
  if (seasons.loading || rankings.loading) {
    content = <SkeletonRows count={6} />;
  } else if (seasons.error || rankings.error) {
    content = (
      <ErrorState
        message="Couldn't load fantasy rankings from the database."
        onRetry={seasons.error ? seasons.reload : rankings.reload}
      />
    );
  } else if (!rankings.data?.length) {
    content = <EmptyState message="No fantasy rankings for this season yet." />;
  } else {
    content = (
      <PlayerRows
        players={rankings.data.map((player) => ({
          playerId: player.player_id,
          playerName: player.full_name,
          pos: `${player.games} games`,
          pts: Number(Number(player.avg_fantasy_pts).toFixed(1)),
          rank: player.fantasy_rank,
        }))}
        onSelect={onSelectPlayer}
        showRank
      />
    );
  }

  return (
    <section className="panel" aria-labelledby="fantasy-rankings-heading" aria-busy={rankings.loading}>
      <p className="crumbs"><a className="link" href="#/analytics">← Analytics</a></p>
      <SectionHeader id="fantasy-rankings-heading" title={`Fantasy rankings${season ? `, ${season}` : ""}`} />
      <p className="lead">
        Average fantasy points per game this season. Games a player sat out are not counted, and players
        need a minimum number of games to be ranked.
      </p>
      {content}
    </section>
  );
}
