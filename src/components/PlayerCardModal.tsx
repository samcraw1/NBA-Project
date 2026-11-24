import { useEffect, useRef } from "react";
import { ApiError, endpoints } from "../api";
import { formatDuration, headshot, shootingPct, showSilhouette, signed } from "../format";
import { useFetch } from "../hooks/useFetch";
import type { PlayerCardData } from "../types";
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

function CardBody({ card }: { card: PlayerCardData }) {
  return (
    <>
      <div className="card-hero">
        <img
          className="card-photo"
          src={headshot(card.playerId, "1040x760")}
          alt=""
          width={520}
          height={380}
          onError={showSilhouette}
        />
        <div>
          <h3 id="player-card-title">{card.playerName}</h3>
          <p className="card-meta">
            #{card.jerseyNum}
            {card.position && ` · ${card.position}`}
          </p>
          <p className="badges">
            {card.starter && <span className="badge">Starter</span>}
            {!card.played && <span className="badge badge-muted">Did not play</span>}
          </p>
        </div>
      </div>
      <h4 className="card-subtitle">Today's game</h4>
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

export function PlayerCardModal({ playerId, onClose }: { playerId: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, loading, error, reload } = useFetch<PlayerCardData>(endpoints.player(playerId));

  // Native <dialog>: gives focus trapping, Esc to close and a backdrop for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  let body;
  if (loading) {
    body = <Loading label="Loading player…" />;
  } else if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    body = (
      <ErrorState
        message={
          notFound
            ? "This player isn't in today's games."
            : "Can't load that player right now. Try again in a minute."
        }
        onRetry={notFound ? undefined : reload}
      />
    );
  } else if (data) {
    body = <CardBody card={data} />;
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
        {!data && <h3 className="sr-only" id="player-card-title">Player card</h3>}
        {body}
      </div>
    </dialog>
  );
}
