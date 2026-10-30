import React, { useEffect, useState } from "react";
import "./styles.css";

type Player = { playerId?: number; playerName: string; pts: number; pos?: string };

type PlayerCardData = {
  playerId: number;
  playerName: string;
  position: string;
  jerseyNum: string;
  minutes: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoals: string;
  threePointers: string;
  freeThrows: string;
  plusMinus: number;
};

type Game = {
  gameId: string;
  status: string;
  away: { teamId: number; tricode: string; score: number };
  home: { teamId: number; tricode: string; score: number };
};

function teamLogo(id: number) {
  return `https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`;
}

type Play = { period: number; clock: string; description: string; score: string };

// "PT31M48.00S" -> "31:48"
function formatMinutes(duration: string) {
  const match = /PT(\d+)M(\d+)/.exec(duration);
  return match ? `${match[1]}:${match[2]}` : "0:00";
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function headshot(id: number, size: "260x190" | "1040x760") {
  return `https://cdn.nba.com/headshots/nba/latest/${size}/${id}.png`;
}

// Swap a broken photo for NBA's generic silhouette, once, so it can't loop.
function showSilhouette(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = headshot(0, "260x190");
}

function PlayerRows({ players, onSelect }: { players: Player[]; onSelect: (id: number) => void }) {
  const top = Math.max(1, ...players.map((p) => p.pts));
  return (
    <ul className="rows">
      {players.map((p, i) => (
        <li className="row" key={`${p.playerName}-${i}`}>
          <span className="name">
            {p.playerId && (
              <img
                className="thumb"
                src={headshot(p.playerId, "260x190")}
                alt=""
                width={54}
                height={40}
                loading="lazy"
                onError={showSilhouette}
              />
            )}
            {p.playerId ? (
              <button type="button" className="name-link" onClick={() => onSelect(p.playerId!)}>
                {p.playerName}
              </button>
            ) : (
              p.playerName
            )}
            {p.pos && <span className="pos">{p.pos}</span>}
          </span>
          <span className="pts">{p.pts}</span>
          <span className="track">
            <span className="bar" style={{ width: `${(p.pts / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function FrontEnd() {
  const [searchquery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [gameId, setGameId] = useState("");
  const [gamePlayers, setGamePlayers] = useState<Player[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState(false);

  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(false);
  const [gamesExpanded, setGamesExpanded] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  const TOP_GAMES = 6;
  const [view, setView] = useState<"box" | "plays">("box");
  const [plays, setPlays] = useState<Play[]>([]);
  const [playsError, setPlaysError] = useState(false);

  const [expanded, setExpanded] = useState(false);

  const [card, setCard] = useState<PlayerCardData | null>(null);
  const [cardError, setCardError] = useState(false);

  const loadGame = (id: string) => {
    setGameId(id);
    setGameLoading(true);
    setGameError(false);
    setPlaysError(false);
    getJson<Player[]>(`/api/games/${id}`)
      .then(setGamePlayers)
      .catch(() => {
        setGamePlayers([]);
        setGameError(true);
      })
      .finally(() => setGameLoading(false));
    getJson<Play[]>(`/api/games/${id}/plays`)
      .then(setPlays)
      .catch(() => {
        setPlays([]);
        setPlaysError(true);
      });
  };

  useEffect(() => {
    getJson<Game[]>("/api/games")
      .then(setGames)
      .catch(() => setGamesError(true))
      .finally(() => setGamesLoading(false));
  }, []);

  const handleSelect = (id: number) => {
    setCardError(false);
    getJson<PlayerCardData>(`/api/players/${id}`)
      .then(setCard)
      .catch(() => {
        setCard(null);
        setCardError(true);
      });
  };

  useEffect(() => {
    getJson<Player[]>("/api/players")
      .then(setPlayers)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId.trim()) return;
    loadGame(gameId.trim());
  };

  const visible = players
    .filter((p) => p.playerName.toLowerCase().includes(searchquery.toLowerCase()))
    .sort((a, b) => b.pts - a.pts);

  const TOP = 15;
  const searching = searchquery.trim() !== "";
  const shown = searching || expanded ? visible : visible.slice(0, TOP);
  const canToggle = !searching && visible.length > TOP;

  let playersContent;
  if (loading) {
    playersContent = <p className="note">Loading players…</p>;
  } else if (loadError) {
    playersContent = (
      <p className="note error">
        Can't load players. NBA.com may be blocking requests, so try again in a minute.
      </p>
    );
  } else if (visible.length === 0) {
    playersContent = (
      <p className="note">
        {searchquery ? `No players match "${searchquery}".` : "No games are on the board yet."}
      </p>
    );
  } else {
    playersContent = <PlayerRows players={shown} onSelect={handleSelect} />;
  }

  return (
    <main className="page">
      <header className="masthead">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <h1>Ball is Life</h1>
        <p>Points from today's games, straight from NBA.com.</p>
      </header>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading">Today's games</h2>
        {gamesLoading && <p className="note">Loading games…</p>}
        {gamesError && (
          <p className="note error">
            Can't load games. NBA.com may be blocking requests, so try again in a minute.
          </p>
        )}
        {!gamesLoading && !gamesError && games.length === 0 && (
          <p className="note">No games on the schedule today.</p>
        )}
        <div className="games">
          {(gamesExpanded ? games : games.slice(0, TOP_GAMES)).map((g) => (
            <button
              type="button"
              key={g.gameId}
              className="game"
              aria-pressed={g.gameId === gameId}
              onClick={() => loadGame(g.gameId)}
            >
              <span className="team">
                <img className="logo" src={teamLogo(g.away.teamId)} alt="" width={28} height={28} loading="lazy" />
                <span className="tricode">{g.away.tricode}</span>
                <span className="score">{g.away.score}</span>
              </span>
              <span className="team">
                <img className="logo" src={teamLogo(g.home.teamId)} alt="" width={28} height={28} loading="lazy" />
                <span className="tricode">{g.home.tricode}</span>
                <span className="score">{g.home.score}</span>
              </span>
              <span className="status">{g.status}</span>
            </button>
          ))}
        </div>
        {games.length > TOP_GAMES && (
          <button
            type="button"
            className="expand"
            aria-expanded={gamesExpanded}
            onClick={() => setGamesExpanded(!gamesExpanded)}
          >
            {gamesExpanded ? `Show first ${TOP_GAMES}` : `Show all ${games.length} games`}
          </button>
        )}
      </section>

      <section aria-labelledby="players-heading">
        <h2 id="players-heading">Today's scorers</h2>
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="player-search">
            Search players
          </label>
          <input
            id="player-search"
            type="search"
            placeholder="Search by player name"
            value={searchquery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>
        {cardError && (
          <p className="note error">Can't load that player right now. Try again in a minute.</p>
        )}
        {card && (
          <article className="card" aria-label={`${card.playerName} stats`}>
            <img
              className="card-photo"
              src={headshot(card.playerId, "1040x760")}
              alt={card.playerName}
              width={520}
              height={380}
              onError={showSilhouette}
            />
            <div className="card-head">
              <h3>
                {card.playerName}
                <span className="pos">
                  #{card.jerseyNum} {card.position}
                </span>
              </h3>
              <button type="button" onClick={() => setCard(null)}>
                Close
              </button>
            </div>
            <dl className="stats">
              <div><dt>Points</dt><dd>{card.points}</dd></div>
              <div><dt>Rebounds</dt><dd>{card.rebounds}</dd></div>
              <div><dt>Assists</dt><dd>{card.assists}</dd></div>
              <div><dt>Steals</dt><dd>{card.steals}</dd></div>
              <div><dt>Blocks</dt><dd>{card.blocks}</dd></div>
              <div><dt>Turnovers</dt><dd>{card.turnovers}</dd></div>
              <div><dt>Minutes</dt><dd>{formatMinutes(card.minutes)}</dd></div>
              <div><dt>Field goals</dt><dd>{card.fieldGoals}</dd></div>
              <div><dt>3-pointers</dt><dd>{card.threePointers}</dd></div>
              <div><dt>Free throws</dt><dd>{card.freeThrows}</dd></div>
              <div><dt>Plus/minus</dt><dd>{card.plusMinus}</dd></div>
            </dl>
          </article>
        )}
        {playersContent}
        {canToggle && (
          <button
            type="button"
            className="expand"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? `Show top ${TOP}` : `Show all ${visible.length} players`}
          </button>
        )}
      </section>

      <section aria-labelledby="game-heading">
        <h2 id="game-heading">Game details</h2>
        <form onSubmit={handleGameSubmit}>
          <label className="sr-only" htmlFor="game-id">
            Game ID
          </label>
          <input
            id="game-id"
            type="text"
            placeholder="Game ID, like 0022600112"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
          />
          <button>Load game</button>
        </form>
        {(gamePlayers.length > 0 || plays.length > 0) && (
          <div className="tabs">
            <button type="button" className="tab" aria-pressed={view === "box"} onClick={() => setView("box")}>
              Box score
            </button>
            <button type="button" className="tab" aria-pressed={view === "plays"} onClick={() => setView("plays")}>
              Play-by-play
            </button>
          </div>
        )}
        {gameLoading && <p className="note">Loading game…</p>}
        {gameError && (
          <p className="note error">No game found for that ID. Check the ID and try again.</p>
        )}
        {view === "box" && gamePlayers.length > 0 && (
          <PlayerRows players={[...gamePlayers].sort((a, b) => b.pts - a.pts)} onSelect={handleSelect} />
        )}
        {view === "plays" && playsError && (
          <p className="note error">Can't load the play-by-play for this game.</p>
        )}
        {view === "plays" && plays.length > 0 && (
          <ol className="plays">
            {[...plays].reverse().map((p, i) => (
              <li key={i}>
                <span className="when">
                  Q{p.period} {formatMinutes(p.clock)}
                </span>
                <span>{p.description}</span>
                <span className="play-score">{p.score}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default FrontEnd;
