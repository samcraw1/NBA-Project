// Planned analytics sections. These are placeholders only: no numbers are shown for
// any of them until the backend can supply real data (see FRONTEND_REQUIREMENTS.md).

export type AnalyticsFeature = {
  slug: string;
  title: string;
  summary: string;
  needs: string[]; // what has to exist on the backend first
};

export const ANALYTICS_FEATURES: AnalyticsFeature[] = [
  {
    slug: "historical-stats",
    title: "Historical player stats",
    summary: "Game logs and career numbers for any player, across seasons.",
    needs: ["Historical game logs stored in PostgreSQL", "A per-player game-log endpoint"],
  },
  {
    slug: "season-rankings",
    title: "Season rankings",
    summary: "2026-27 league scoring leaders ranked by points per game.",
    needs: [],
  },
  {
    slug: "fantasy-trends",
    title: "Fantasy points trends",
    summary: "Each player's latest rolling five-game fantasy average for 2026-27.",
    needs: [],
  },
  {
    slug: "player-trends",
    title: "Player performance trends",
    summary: "Rolling averages and consistency over a player's recent games.",
    needs: ["Per-game history for each player", "Rolling-average calculations (SQL or pandas)"],
  },
  {
    slug: "team-analytics",
    title: "Team analytics",
    summary: "Team scoring, pace and results over a season.",
    needs: ["Team-game stats in the database", "Team list and team stats endpoints"],
  },
  {
    slug: "player-comparison",
    title: "Player comparisons",
    summary: "Put two players side by side on the same stats.",
    needs: ["Season or recent-game stats per player", "A comparison endpoint"],
  },
  {
    slug: "predictions",
    title: "Machine learning predictions",
    summary: "Model-based projections, always shown next to a simple baseline.",
    needs: ["A trained and evaluated model", "A prediction endpoint with model metadata"],
  },
  {
    slug: "pipeline-monitoring",
    title: "Data pipeline monitoring",
    summary: "Run history, row counts and failures for the ingestion pipeline.",
    needs: ["A pipeline that records its runs", "A pipeline status endpoint"],
  },
];
