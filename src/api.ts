// All network access goes through here. Relative URLs only: Vite proxies /api
// to the FastAPI server (see vite.config.ts), so no hosts or keys live in the frontend.

export class ApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}

export const endpoints = {
  games: "/api/games",
  players: "/api/players",
  game: (gameId: string) => `/api/games/${encodeURIComponent(gameId)}`,
  plays: (gameId: string) => `/api/games/${encodeURIComponent(gameId)}/plays`,
  player: (playerId: number) => `/api/players/${playerId}`,
};
