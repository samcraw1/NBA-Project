import { useMemo } from "react";
import { GamesSection } from "../components/GamesSection";
import { PlayerRows } from "../components/PlayerRows";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { slateWords } from "../format";
import type { FetchState, Game, PlayerPoints } from "../types";

const TOP_PLAYERS = 15;
const TOP_GAMES = 6;

export function Dashboard({
  games,
  players,
  onSelectPlayer,
}: {
  games: FetchState<Game[]>;
  players: FetchState<PlayerPoints[]>;
  onSelectPlayer: (playerId: number) => void;
}) {
  const top = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => b.pts - a.pts).slice(0, TOP_PLAYERS),
    [players.data],
  );

  let performers;
  if (players.loading) {
    performers = <SkeletonRows count={6} />;
  } else if (players.error) {
    performers = (
      <ErrorState
        message="Can't load players. NBA.com may be blocking requests, so try again in a minute."
        onRetry={players.reload}
      />
    );
  } else if (top.length === 0) {
    performers = <EmptyState message="No player stats yet. Games haven't started." />;
  } else {
    performers = <PlayerRows players={top} onSelect={onSelectPlayer} showRank />;
  }

  const words = slateWords(games.data?.[0]?.gameDate);

  return (
    <>
      <div className="hero">
        <h1>{words.hero}</h1>
        <p>Game scores, player stats and season analytics from the project database.</p>
      </div>

      <GamesSection games={games} title={words.title} limit={TOP_GAMES} showAllLink />

      <section className="panel" aria-labelledby="top-heading" aria-busy={players.loading}>
        <SectionHeader
          id="top-heading"
          title={`Top ${TOP_PLAYERS} performances`}
          action={
            <a className="link" href="#/players">
              Search all players →
            </a>
          }
        />
        {performers}
      </section>
    </>
  );
}
