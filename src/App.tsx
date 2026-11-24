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

export default function App() {
  const route = useHashRoute();
  const { theme, toggle } = useTheme();

  // Fetched once here and shared, so moving between pages doesn't re-hit the backend.
  // (/api/players is the slow one: the backend loads every game's box score.)
  const games = useFetch<Game[]>(endpoints.games);
  const players = useFetch<PlayerPoints[]>(endpoints.players);

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
    page = <PlayersPage players={players} onSelectPlayer={setSelectedPlayer} />;
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
