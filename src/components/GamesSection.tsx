import type { FetchState, Game } from "../types";
import { GameCard } from "./GameCard";
import { SectionHeader } from "./SectionHeader";
import { EmptyState, ErrorState } from "./StateMessage";

export function GamesSection({
  games,
  title,
  limit,
  showAllLink = false,
}: {
  games: FetchState<Game[]>;
  title: string;
  limit?: number;
  showAllLink?: boolean;
}) {
  const list = games.data ?? [];
  const shown = limit ? list.slice(0, limit) : list;

  let body;
  if (games.loading) {
    body = (
      <div className="game-grid" aria-hidden="true">
        {Array.from({ length: limit ?? 6 }, (_, i) => (
          <div className="game-card skeleton" key={i} />
        ))}
      </div>
    );
  } else if (games.error) {
    body = (
      <ErrorState
        message="Can't load game data. Check the connection and try again."
        onRetry={games.reload}
      />
    );
  } else if (list.length === 0) {
    body = <EmptyState message="No recent games found." />;
  } else {
    body = (
      <div className="game-grid">
        {shown.map((g) => (
          <GameCard key={g.gameId} game={g} />
        ))}
      </div>
    );
  }

  return (
    <section className="panel" aria-labelledby="games-heading" aria-busy={games.loading}>
      <SectionHeader
        id="games-heading"
        title={title}
        action={
          showAllLink && list.length > shown.length ? (
            <a className="link" href="#/games">
              All {list.length} games →
            </a>
          ) : undefined
        }
      />
      {body}
    </section>
  );
}
