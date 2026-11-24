import { gameState, teamLogo, type GameState } from "../format";
import type { Game, TeamScore } from "../types";

export function StatusPill({ status }: { status: string }) {
  const state = gameState(status);
  return (
    <span className={`status status-${state}`}>
      {state === "live" && <span className="dot" aria-hidden="true" />}
      {status}
    </span>
  );
}

export function TeamLine({
  team,
  state,
  dimmed,
}: {
  team: TeamScore;
  state: GameState;
  dimmed: boolean;
}) {
  return (
    <span className={`team${dimmed ? " team-lost" : ""}`}>
      <img className="logo" src={teamLogo(team.teamId)} alt="" width={32} height={32} loading="lazy" />
      <span className="tricode">{team.tricode}</span>
      {/* Games that haven't started report 0-0, which isn't a score worth showing. */}
      <span className="score">{state === "upcoming" ? "–" : team.score}</span>
    </span>
  );
}

export function GameCard({ game }: { game: Game }) {
  const state = gameState(game.status);
  const awayWon = game.away.score > game.home.score;
  const homeWon = game.home.score > game.away.score;
  return (
    <a
      className="game-card"
      href={`#/games/${game.gameId}`}
      aria-label={`${game.away.tricode} at ${game.home.tricode}, ${game.status}. Open game details.`}
    >
      <StatusPill status={game.status} />
      <TeamLine team={game.away} state={state} dimmed={state === "final" && homeWon} />
      <TeamLine team={game.home} state={state} dimmed={state === "final" && awayWon} />
    </a>
  );
}
