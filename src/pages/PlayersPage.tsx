import { useMemo, useState } from "react";
import { PlayerRows } from "../components/PlayerRows";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import type { FetchState, PlayerPoints } from "../types";

const PAGE_SIZE = 50;

type Sort = "pts" | "name";

export function PlayersPage({
  players,
  onSelectPlayer,
}: {
  players: FetchState<PlayerPoints[]>;
  onSelectPlayer: (playerId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("pts");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = (players.data ?? []).filter((p) => p.playerName.toLowerCase().includes(q));
    return found.sort((a, b) =>
      sort === "pts" ? b.pts - a.pts : a.playerName.localeCompare(b.playerName),
    );
  }, [players.data, query, sort]);

  const visible = matches.slice(0, limit);
  const total = players.data?.length ?? 0;

  let body;
  if (players.loading) {
    body = <SkeletonRows count={8} />;
  } else if (players.error) {
    body = (
      <ErrorState
        message="Can't load players. NBA.com may be blocking requests, so try again in a minute."
        onRetry={players.reload}
      />
    );
  } else if (matches.length === 0) {
    body = (
      <EmptyState
        message={query.trim() ? `No players match "${query.trim()}".` : "No games are on the board yet."}
      />
    );
  } else {
    body = <PlayerRows players={visible} onSelect={onSelectPlayer} />;
  }

  return (
    <section className="panel" aria-labelledby="players-heading" aria-busy={players.loading}>
      <SectionHeader id="players-heading" title="Player directory" />
      <p className="lead">Players from today's games. Historical players are coming soon.</p>
      <div className="search-form">
        <label className="sr-only" htmlFor="player-search">
          Search players
        </label>
        <input
          id="player-search"
          className="input"
          type="search"
          placeholder="Search by player name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
        />
        <label className="sr-only" htmlFor="player-sort">
          Sort players
        </label>
        <select id="player-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="pts">Most points</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {!players.loading && !players.error && total > 0 && (
        <p className="note" role="status">
          {matches.length === total
            ? `${total} players`
            : `${matches.length} of ${total} players`}
        </p>
      )}
      {body}
      {matches.length > visible.length && (
        <button type="button" className="btn btn-ghost expand" onClick={() => setLimit(limit + PAGE_SIZE)}>
          Show more ({matches.length - visible.length} remaining)
        </button>
      )}
    </section>
  );
}
