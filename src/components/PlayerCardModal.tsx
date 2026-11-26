import { useEffect, useRef, useState } from "react";
import { ApiError, endpoints } from "../api";
import { formatDuration, headshot, monthDay, ratioPct, shootingPct, showSilhouette, shortDate, signed } from "../format";
import { useFetch } from "../hooks/useFetch";
import type { PlayerCardData, SeasonCard } from "../types";
import { ErrorState, Loading } from "./StateMessage";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {sub && <span className="stat-sub">{sub}</span>}
      </dd>
    </div>
  );
}

// One game from NBA.com's box score. Only present when the player was in the games on screen.
function LatestGame({ card }: { card: PlayerCardData }) {
  return (
    <>
      <h4 className="card-subtitle">Latest game</h4>
      <dl className="stats">
        <Stat label="Points" value={card.points} />
        <Stat label="Rebounds" value={card.rebounds} />
        <Stat label="Assists" value={card.assists} />
        <Stat label="Steals" value={card.steals} />
        <Stat label="Blocks" value={card.blocks} />
        <Stat label="Turnovers" value={card.turnovers} />
        <Stat label="Minutes" value={formatDuration(card.minutes)} />
        <Stat label="+/−" value={signed(card.plusMinus)} />
        <Stat label="FG" value={card.fieldGoals} sub={shootingPct(card.fieldGoals)} />
        <Stat label="3PT" value={card.threePointers} sub={shootingPct(card.threePointers)} />
        <Stat label="FT" value={card.freeThrows} sub={shootingPct(card.freeThrows)} />
      </dl>
    </>
  );
}

// Season averages and the last five games, from the project's database.
function SeasonSection({ card, onSeason }: { card: SeasonCard; onSeason: (season: string) => void }) {
  const a = card.averages;
  return (
    <>
      <div className="card-season-row">
        <h4 className="card-subtitle">Season averages</h4>
        {card.seasons.length > 1 ? (
          <select className="select" aria-label="Season" value={card.season} onChange={(e) => onSeason(e.target.value)}>
            {card.seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <span className="badge">{card.season}</span>
        )}
      </div>
      <dl className="stats">
        <Stat label="Games" value={a.gp} />
        <Stat label="Min" value={a.min} />
        <Stat label="Points" value={a.pts} />
        <Stat label="Rebounds" value={a.reb} />
        <Stat label="Assists" value={a.ast} />
        <Stat label="Steals" value={a.stl} />
        <Stat label="Blocks" value={a.blk} />
        <Stat label="Turnovers" value={a.tov} />
        <Stat label="FG%" value={ratioPct(a.fgPct)} />
        <Stat label="3P%" value={ratioPct(a.fg3Pct)} />
        <Stat label="FT%" value={ratioPct(a.ftPct)} />
      </dl>

      <h4 className="card-subtitle">Last 5 games</h4>
      <table className="mini-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Opp</th>
            <th scope="col">W/L</th>
            <th scope="col">PTS</th>
            <th scope="col">REB</th>
            <th scope="col">AST</th>
            <th scope="col">MIN</th>
          </tr>
        </thead>
        <tbody>
          {card.lastGames.map((g) => (
            <tr key={g.date}>
              <td>{monthDay(g.date)}</td>
              <td>
                {g.home ? "vs" : "@"} {g.opponent ?? "—"}
              </td>
              <td>{g.result ?? "—"}</td>
              <td>{g.pts}</td>
              <td>{g.reb}</td>
              <td>{g.ast}</td>
              <td>{g.min}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {card.through && <p className="note">Season stats through {shortDate(card.through)}.</p>}
    </>
  );
}

export function PlayerCardModal({ playerId, onClose }: { playerId: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Two sources: NBA.com for the player's game in the games on screen (404 if they weren't in one),
  // and the database for season stats (any player with stats).
  const live = useFetch<PlayerCardData>(endpoints.player(playerId));
  const [season, setSeason] = useState<string | null>(null);
  const stats = useFetch<SeasonCard>(endpoints.playerSeason(playerId, season));

  // Keep showing the previous season's card while a different season loads, so nothing flashes.
  const [card, setCard] = useState<SeasonCard | null>(null);
  useEffect(() => {
    if (stats.data) setCard(stats.data);
  }, [stats.data]);

  // Native <dialog>: gives focus trapping, Esc to close and a backdrop for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const isNotFound = (err: Error | null) => err instanceof ApiError && err.status === 404;
  const name = card?.playerName ?? live.data?.playerName;

  let body;
  if (!card && !live.data) {
    if (live.loading || stats.loading) {
      body = <Loading label="Loading player…" />;
    } else {
      const notFound = isNotFound(stats.error) && isNotFound(live.error);
      body = (
        <ErrorState
          message={
            notFound ? "No stats found for this player." : "Can't load that player right now. Try again in a minute."
          }
          onRetry={
            notFound
              ? undefined
              : () => {
                  live.reload();
                  stats.reload();
                }
          }
        />
      );
    }
  } else {
    const meta = [card?.team, live.data ? `#${live.data.jerseyNum}` : null, live.data?.position]
      .filter(Boolean)
      .join(" · ");
    body = (
      <>
        <div className="card-hero">
          <img
            className="card-photo"
            src={headshot(playerId, "1040x760")}
            alt=""
            width={520}
            height={380}
            onError={showSilhouette}
          />
          <div>
            <h3 id="player-card-title">{name}</h3>
            {meta && <p className="card-meta">{meta}</p>}
            {live.data && (
              <p className="badges">
                {live.data.starter && <span className="badge">Starter</span>}
                {!live.data.played && <span className="badge badge-muted">Did not play</span>}
              </p>
            )}
          </div>
        </div>
        {live.data && <LatestGame card={live.data} />}
        {card ? (
          <SeasonSection card={card} onSeason={setSeason} />
        ) : stats.loading ? (
          <Loading label="Loading season stats…" />
        ) : stats.error && !isNotFound(stats.error) ? (
          <ErrorState message="Season stats aren't available right now." onRetry={stats.reload} />
        ) : null}
      </>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="player-card-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div className="modal-inner">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close player card">
          ×
        </button>
        {/* Keeps the dialog labelled while loading or on error. */}
        {!name && <h3 className="sr-only" id="player-card-title">Player card</h3>}
        {body}
      </div>
    </dialog>
  );
}
