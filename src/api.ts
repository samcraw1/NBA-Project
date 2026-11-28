// Local development uses Vite's /api proxy. The hosted build supplies the API base URL.

export class ApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const response = await fetch(`${apiBase}${url}`, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}

export const endpoints = {
  games: "/api/games",
  players: "/api/players",
  game: (gameId: string) => `/api/games/${encodeURIComponent(gameId)}`,
  plays: (gameId: string) => `/api/games/${encodeURIComponent(gameId)}/plays`,
  gamePlayerRankings: (gameId: string) =>
    `/api/games/${encodeURIComponent(gameId)}/player-rankings`,
  player: (playerId: number) => `/api/players/${playerId}`,
  playerSearch: (q: string, limit: number) =>
    `/api/players/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  playerSeason: (playerId: number, season: string | null) =>
    `/api/players/${playerId}/season${season ? `?season=${encodeURIComponent(season)}` : ""}`,
  seasons: "/api/seasons",
  seasonAverages: (season: string) => `/api/averages?season=${encodeURIComponent(season)}`,
  fantasySeasonRankings: (season: string) => `/api/fantasy/season-rankings?season=${encodeURIComponent(season)}`,
  fantasyLeaders: (season: string) => `/api/fantasy/rolling-averages?season=${encodeURIComponent(season)}`,
  topGames: "/api/team_player_points",
  teamAverages: "/api/team_averages",
  teamAveragesFor: (season: string) => `/api/team_averages?season=${encodeURIComponent(season)}`,
};
