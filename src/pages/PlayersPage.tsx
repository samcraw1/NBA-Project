import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import { PlayerRows } from "../components/PlayerRows";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { useFetch } from "../hooks/useFetch";
import type { PlayerSearchResult } from "../types";

const PAGE_SIZE = 50;
const MAX_RESULTS = 100; // the backend's cap

type Sort = "pts" | "name";

export function PlayersPage({ onSelectPlayer }: { onSelectPlayer: (playerId: number) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("pts");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Wait for a pause in typing before asking the backend.
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Searches the database, so any player with stats shows up, not just today's games.
  const results = useFetch<PlayerSearchResult[]>(endpoints.playerSearch(term, limit));

  const shown = useMemo(() => {
    const list = [...(results.data ?? [])]; // the server already sorts by points per game
    if (sort === "name") list.sort((a, b) => a.playerName.localeCompare(b.playerName));
    return list;
  }, [results.data, sort]);

  const canShowMore = shown.length === limit && limit < MAX_RESULTS;

  let body;
  if (results.loading) {
    body = <SkeletonRows count={8} />;
  } else if (results.error) {
    body = (
      <ErrorState message="Can't search players right now. Try again in a minute." onRetry={results.reload} />
    );
  } else if (shown.length === 0) {
    body = <EmptyState message={term ? `No players match "${term}".` : "No player stats in the database yet."} />;
  } else {
    body = <PlayerRows players={shown} onSelect={onSelectPlayer} />;
  }

  return (
    <section className="panel" aria-labelledby="players-heading" aria-busy={results.loading}>
      <SectionHeader id="players-heading" title="Player directory" />
      <p className="lead">
        Search any player to see their season stats. Numbers are points per game this season.
      </p>
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
      {!results.loading && !results.error && shown.length > 0 && (
        <p className="note" role="status">
          {term ? `${shown.length} ${shown.length === 1 ? "player" : "players"}` : "Scoring leaders this season"}
        </p>
      )}
      {body}
      {canShowMore && (
        <button type="button" className="btn btn-ghost expand" onClick={() => setLimit(limit + PAGE_SIZE)}>
          Show more
        </button>
      )}
    </section>
  );
}
