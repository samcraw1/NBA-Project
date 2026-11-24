// Shapes of the JSON returned by the FastAPI backend (server.py).
// Keep these in sync with the backend; they are the frontend's API contract.

export type TeamScore = { teamId: number; tricode: string; score: number };

export type Game = {
  gameId: string; // string on purpose: IDs have leading zeros ("0022600287")
  status: string; // "Final", "4th Qtr", "10:00 pm ET", ...
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

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};
