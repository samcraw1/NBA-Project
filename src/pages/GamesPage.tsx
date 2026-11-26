import { useState, type FormEvent } from "react";
import { GamesSection } from "../components/GamesSection";
import { slateWords } from "../format";
import type { FetchState, Game } from "../types";

export function GamesPage({ games }: { games: FetchState<Game[]> }) {
  const [gameId, setGameId] = useState("");

  // Lets you open any game by ID, like the original "Game details" form.
  const openGame = (e: FormEvent) => {
    e.preventDefault();
    const id = gameId.trim();
    if (id) window.location.hash = `#/games/${encodeURIComponent(id)}`;
  };

  return (
    <>
      <GamesSection games={games} title={`All ${slateWords(games.data?.[0]?.gameDate).title.toLowerCase()}`} />
      <section className="panel" aria-labelledby="lookup-heading">
        <div className="section-header">
          <h2 id="lookup-heading">Look up a game by ID</h2>
        </div>
        <form className="search-form" onSubmit={openGame}>
          <label className="sr-only" htmlFor="game-id">
            Game ID
          </label>
          <input
            id="game-id"
            className="input"
            type="text"
            placeholder="Game ID, like 0022600112"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <button type="submit" className="btn">
            Load game
          </button>
        </form>
      </section>
    </>
  );
}
