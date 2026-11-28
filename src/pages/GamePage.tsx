import { useMemo, useState } from "react";
import { endpoints } from "../api";
import { StatusPill, TeamLine } from "../components/GameCard";
import { PlayByPlay } from "../components/PlayByPlay";
import { PlayerRows } from "../components/PlayerRows";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { gameState } from "../format";
import { useFetch } from "../hooks/useFetch";
import type { FetchState, Game, GamePlayer, GamePlayerRanking, Play } from "../types";

type Tab = "box" | "plays";

export function GamePage({
  gameId,
  games,
  onSelectPlayer,
}: {
  gameId: string;
  games: FetchState<Game[]>;
  onSelectPlayer: (playerId: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("box");
  const box = useFetch<GamePlayer[]>(endpoints.game(gameId));
  const plays = useFetch<Play[]>(endpoints.plays(gameId));
  const rankings = useFetch<GamePlayerRanking[]>(endpoints.gamePlayerRankings(gameId));

  // The score header comes from the games list when this game is on today's board.
  const game = games.data?.find((g) => g.gameId === gameId);
  const sorted = useMemo(() => [...(box.data ?? [])].sort((a, b) => b.pts - a.pts), [box.data]);

  let boxBody;
  if (box.loading) {
    boxBody = <SkeletonRows count={8} />;
  } else if (box.error) {
    boxBody = (
      <ErrorState
        message="Can't load this game. Check the game ID, or try again in a minute."
        onRetry={box.reload}
      />
    );
  } else if (sorted.length === 0) {
    boxBody = <EmptyState message="No player stats for this game yet." />;
  } else {
    boxBody = <PlayerRows players={sorted} onSelect={onSelectPlayer} />;
  }

  let playsBody;
  if (plays.loading) {
    playsBody = <SkeletonRows count={8} />;
  } else if (plays.error) {
    playsBody = (
      <ErrorState message="Can't load the play-by-play for this game." onRetry={plays.reload} />
    );
  } else if (!plays.data || plays.data.length === 0) {
    playsBody = <EmptyState message="Play-by-play isn't stored in the project database." />;
  } else {
    playsBody = <PlayByPlay plays={plays.data} />;
  }

  const rankedPlayers = (rankings.data ?? []).map((player) => ({
    ...player,
    rank: player.gameRank,
  }));

  let rankingsBody;
  if (rankings.loading) {
    rankingsBody = <SkeletonRows count={8} />;
  } else if (rankings.error) {
    rankingsBody = (
      <ErrorState
        message="Couldn't load the database rankings for this game."
        onRetry={rankings.reload}
      />
    );
  } else if (rankedPlayers.length === 0) {
    rankingsBody = <EmptyState message="No player stats for this game are loaded in PostgreSQL yet." />;
  } else {
    rankingsBody = <PlayerRows players={rankedPlayers} onSelect={onSelectPlayer} showRank />;
  }

  return (
    <>
      <section className="panel" aria-labelledby="game-heading">
        <p className="crumbs">
          <a className="link" href="#/games">← All games</a>
        </p>
        {game ? (
          <div className="scoreboard">
            <h2 id="game-heading" className="sr-only">
              {game.away.tricode} at {game.home.tricode}
            </h2>
            <TeamLine team={game.away} state={gameState(game.status)} dimmed={false} />
            <StatusPill status={game.status} />
            <TeamLine team={game.home} state={gameState(game.status)} dimmed={false} />
          </div>
        ) : (
          <h2 id="game-heading">Game {gameId}</h2>
        )}
      </section>

      <section className="panel" aria-label="Game details">
        <div className="tabs" role="tablist" aria-label="Game views">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === "box"}
            onClick={() => setTab("box")}
          >
            Box score
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === "plays"}
            onClick={() => setTab("plays")}
          >
            Play-by-play
          </button>
        </div>
        <div role="tabpanel">{tab === "box" ? boxBody : playsBody}</div>
        {tab === "box" && sorted.length > 0 && (
          <p className="note">
            Showing points only. Full box score stats need a backend update (see
            FRONTEND_REQUIREMENTS.md). Tap a player for their full line.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="game-player-rankings-heading">
        <h3 id="game-player-rankings-heading" className="card-subtitle">
          Player scoring ranks
        </h3>
        <p className="note">Ranked by points from the PostgreSQL game stats.</p>
        {rankingsBody}
      </section>
    </>
  );
}
