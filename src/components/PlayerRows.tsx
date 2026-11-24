import { headshot, showSilhouette } from "../format";
import type { PlayerPoints } from "../types";

// Works for both /api/players rows and /api/games/{id} rows (which add pos and played).
export type RowPlayer = PlayerPoints & { pos?: string | null; played?: boolean };

export function PlayerRows({
  players,
  onSelect,
  showRank = false,
}: {
  players: RowPlayer[];
  onSelect: (playerId: number) => void;
  showRank?: boolean;
}) {
  const top = Math.max(1, ...players.map((p) => p.pts));
  return (
    <ul className="rows">
      {players.map((p, i) => (
        <li className="row" key={`${p.playerId}-${i}`}>
          {showRank && <span className="rank">{i + 1}</span>}
          <img
            className="thumb"
            src={headshot(p.playerId, "260x190")}
            alt=""
            width={54}
            height={40}
            loading="lazy"
            onError={showSilhouette}
          />
          <span className="info">
            <span className="name-line">
              <button type="button" className="player-link" onClick={() => onSelect(p.playerId)}>
                {p.playerName}
              </button>
              {p.pos && <span className="pos">{p.pos}</span>}
            </span>
            <span className="track" aria-hidden="true">
              <span className="bar" style={{ width: `${(p.pts / top) * 100}%` }} />
            </span>
          </span>
          <span className={`pts${p.played === false ? " pts-dnp" : ""}`}>
            {p.played === false ? "DNP" : p.pts}
            <span className="sr-only"> points</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
