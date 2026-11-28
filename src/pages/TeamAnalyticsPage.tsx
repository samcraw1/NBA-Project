import { endpoints } from "../api";
import { EmptyState, ErrorState, SkeletonRows } from "../components/StateMessage";
import { SectionHeader } from "../components/SectionHeader";
import { useFetch } from "../hooks/useFetch";
import type { TeamAverage } from "../types";

export function TeamAnalyticsPage() {
  // Newest season loaded in the database, same as the Analytics page.
  const seasons = useFetch<string[]>(endpoints.seasons);
  const season = seasons.data?.[0];
  const teams = useFetch<TeamAverage[]>(season ? endpoints.teamAveragesFor(season) : null);

  let content;
  if (seasons.loading || teams.loading) {
    content = <SkeletonRows count={5} />;
  } else if (seasons.error || teams.error) {
    content = (
      <ErrorState
        message="Couldn't load team scoring from the database."
        onRetry={seasons.error ? seasons.reload : teams.reload}
      />
    );
  } else if (!teams.data?.length) {
    content = <EmptyState message="No team scoring for this season yet." />;
  } else {
    const top = teams.data[0].pts_per_game;
    content = (
      <ul className="rows">
        {teams.data.map((t) => (
          <li className="row" key={t.team_id}>
            <span className="rank">{t.team_rank}</span>
            <span className="info">
              <span className="name-line">
                {t.full_name} <span style={{ color: "var(--muted)" }}>({t.games} games)</span>
              </span>
              <span className="track" aria-hidden="true">
                <span className="bar" style={{ width: `${(t.pts_per_game / top) * 100}%` }} />
              </span>
            </span>
            <span className="pts">
              {Number(t.pts_per_game).toFixed(1)}
              <span className="sr-only"> points per game</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="panel" aria-labelledby="team-analytics-heading" aria-busy={teams.loading}>
      <p className="crumbs"><a className="link" href="#/analytics">← Analytics</a></p>
      <SectionHeader id="team-analytics-heading" title={`Team scoring${season ? `, ${season}` : ""}`} />
      <p className="lead">
        Points per game for every team: points are summed per team per game first, then averaged.
      </p>
      {content}
    </section>
  );
}
