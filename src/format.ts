import type { SyntheticEvent } from "react";

export function teamLogo(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

export function headshot(playerId: number, size: "260x190" | "1040x760"): string {
  return `https://cdn.nba.com/headshots/nba/latest/${size}/${playerId}.png`;
}

// Swap a broken photo for NBA's generic silhouette, once, so it can't loop.
export function showSilhouette(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = "1";
  img.src = headshot(0, "260x190");
}

// "PT31M48.00S" -> "31:48"
export function formatDuration(duration: string): string {
  const match = /^PT(\d+)M(\d+)/.exec(duration);
  return match ? `${Number(match[1])}:${match[2]}` : "0:00";
}

export function periodLabel(period: number): string {
  return period <= 4 ? `Q${period}` : `OT${period - 4}`;
}

export type GameState = "final" | "live" | "upcoming";

// The API only gives a status string, so this is a heuristic:
// "Final" -> final, "10:00 pm ET" -> upcoming, anything else -> live.
// A numeric status from the backend would be more reliable (see FRONTEND_REQUIREMENTS.md).
export function gameState(status: string): GameState {
  if (/^final/i.test(status)) return "final";
  if (/\b(am|pm)\b/i.test(status)) return "upcoming";
  return "live";
}

// "5/11" -> "45%"; "0/0" -> "—" (no attempts, so no percentage)
export function shootingPct(fraction: string): string {
  const [made, attempted] = fraction.split("/").map(Number);
  if (!attempted || Number.isNaN(made)) return "—";
  return `${Math.round((made / attempted) * 100)}%`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function localISO(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// "2026-11-25" -> "Wed, Nov 25"
export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// "2026-11-25" -> "Nov 25"
export function monthDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// The backend shows today's games, or the latest day that had games when nothing is on today.
// These words say which one the page is showing.
export function slateWords(gameDate: string | undefined): { hero: string; title: string } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (!gameDate || gameDate === localISO(now)) return { hero: "Tonight's NBA", title: "Today's games" };
  if (gameDate === localISO(yesterday)) return { hero: "Last night's NBA", title: "Last night's games" };
  return { hero: "Latest NBA", title: `Games on ${shortDate(gameDate)}` };
}

// 0.4567 -> "45.7%"; null (no attempts) -> "—"
export function ratioPct(ratio: number | null): string {
  return ratio === null ? "—" : `${(ratio * 100).toFixed(1)}%`;
}
