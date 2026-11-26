import { useEffect, useState } from "react";
import { endpoints } from "./api";
import { Header } from "./components/Header";
import { PlayerCardModal } from "./components/PlayerCardModal";
import { EmptyState } from "./components/StateMessage";
import { useFetch } from "./hooks/useFetch";
import { useHashRoute } from "./hooks/useHashRoute";
import { useTheme } from "./hooks/useTheme";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { Dashboard } from "./pages/Dashboard";
import { GamePage } from "./pages/GamePage";
import { GamesPage } from "./pages/GamesPage";
import { PlayersPage } from "./pages/PlayersPage";
import type { Game, PlayerPoints } from "./types";

const LIVE_MS = 30_000; // refresh every 30s while a game is in progress
const IDLE_MS = 5 * 60_000; // and every 5 minutes otherwise
const pollMs = (games: Game[] | null) => (games?.some((g) => g.state === 2) ? LIVE_MS : IDLE_MS);

export default function App() {
  const route = useHashRoute();
  const { theme, toggle } = useTheme();

  // Fetched once here and shared, so moving between pages doesn't re-hit the backend.
  // The backend returns today's games, or the latest day that had games, and both lists refresh
  // on a timer so the page keeps up as the season goes on.
  const games = useFetch<Game[]>(endpoints.games, pollMs);
  const players = useFetch<PlayerPoints[]>(endpoints.players, () => pollMs(games.data));

  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const [section, param] = route.split("/").filter(Boolean);

  let page;
  if (!section) {
    page = <Dashboard games={games} players={players} onSelectPlayer={setSelectedPlayer} />;
  } else if (section === "games" && param) {
    page = (
      <GamePage
        key={param}
        gameId={decodeURIComponent(param)}
        games={games}
        onSelectPlayer={setSelectedPlayer}
      />
    );
  } else if (section === "games") {
    page = <GamesPage games={games} />;
  } else if (section === "players") {
    page = <PlayersPage onSelectPlayer={setSelectedPlayer} />;
  } else if (section === "analytics") {
    page = <AnalyticsPage slug={param} />;
  } else {
    page = (
      <section className="panel">
        <EmptyState message="That page doesn't exist." />
        <p className="center">
          <a className="link" href="#/">Back to scores</a>
        </p>
      </section>
    );
  }

  return (
    <>
      <Header route={route} theme={theme} onToggleTheme={toggle} />
      <main className="page">{page}</main>
      <footer className="footer">
        Live data from NBA.com's public endpoints. An unofficial learning project, not affiliated
        with the NBA.
      </footer>
      {selectedPlayer !== null && (
        <PlayerCardModal
          key={selectedPlayer}
          playerId={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}
