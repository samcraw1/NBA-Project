// Shapes of the JSON returned by the FastAPI backend (server.py).
// Keep these in sync with the backend; they are the frontend's API contract.

export type TeamScore = { teamId: number; tricode: string; score: number };

export type Game = {
  gameId: string; // string on purpose: IDs have leading zeros ("0022600287")
  status: string; // "Final", "4th Qtr", "10:00 pm ET", ...
  state: number; // 1 = not started, 2 = live, 3 = final
  gameDate: string; // "2026-11-25": the day these games were played (latest game day if none today)
  away: TeamScore;
  home: TeamScore;
};

// GET /api/players
export type PlayerPoints = { playerId: number; playerName: string; pts: number };

// GET /api/games/{gameId}
export type GamePlayer = PlayerPoints & {
  pos: string | null; // NBA.com leaves this empty for many bench players
  played: boolean;
};

// GET /api/games/{gameId}/player-rankings (from PostgreSQL)
export type GamePlayerRanking = PlayerPoints & { gameId: string; gameRank: number };

// GET /api/games/{gameId}/plays
export type Play = {
  period: number;
  description: string;
  clock: string; // ISO duration, e.g. "PT12M00.00S"
  score: string; // "away - home", e.g. "54 - 61"
};

// GET /api/players/{playerId}
export type PlayerCardData = {
  playerId: number;
  playerName: string;
  position: string | null;
  jerseyNum: string;
  starter: boolean;
  played: boolean;
  minutes: string; // ISO duration, e.g. "PT27M33.00S"
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoals: string; // "made/attempted"
  threePointers: string;
  freeThrows: string;
  plusMinus: number;
};

// GET /api/team_player_points (from Postgres): top single-game scores of the season
export type TopGame = { player: string; team: string; pts: number };

// GET /api/team_averages (from Postgres): average team points per game
export type TeamAverage = {
  team_id: number;
  full_name: string;
  pts_per_game: number;
  games: number;
  team_rank: number;
};

// GET /api/averages: player season scoring rank, calculated from game logs
export type SeasonScoringLeader = {
  player_id?: number;
  full_name: string;
  season: string;
  average_points: number;
  average_rank?: number;
};

export type FantasyTrendLeader = {
  player_id: number;
  full_name: string;
  season: string;
  game_date: string;
  rolling_5_game_fantasy_avg: number;
};


// GET /api/players/search (from the database). "pts" is points per game this season, "pos" is the team.
export type PlayerSearchResult = PlayerPoints & { pos: string; gp: number };

// GET /api/players/{playerId}/season (from the database)
export type SeasonCard = {
  playerId: number;
  playerName: string;
  team: string; // most recent team tricode
  season: string; // "2026-27"
  seasons: string[]; // every season this player has stats for, newest first
  through: string | null; // newest game date in the database
  averages: {
    gp: number;
    min: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    tov: number;
    fgPct: number | null; // 0..1, null when no attempts
    fg3Pct: number | null;
    ftPct: number | null;
  };
  lastGames: {
    date: string;
    opponent: string | null;
    home: boolean;
    result: string | null; // "W" | "L"
    pts: number;
    reb: number;
    ast: number;
    min: number;
  }[];
};

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};
