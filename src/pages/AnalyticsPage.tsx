import { ANALYTICS_FEATURES } from "../analytics";
import { ComingSoonCard, ComingSoonDetail } from "../components/ComingSoon";
import { SeasonStats } from "../components/SeasonStats";
import { SectionHeader } from "../components/SectionHeader";
import { SeasonRankingsPage } from "./SeasonRankingsPage";
import { FantasyTrendsPage } from "./FantasyTrendsPage";
import { TeamAnalyticsPage } from "./TeamAnalyticsPage";
import { FantasyRankingsPage } from "./FantasyRankingsPage";

export function AnalyticsPage({
  slug,
  onSelectPlayer,
}: {
  slug?: string;
  onSelectPlayer: (playerId: number) => void;
}) {
  if (slug) {
    if (slug === "season-rankings") return <SeasonRankingsPage onSelectPlayer={onSelectPlayer} />;
    if (slug === "fantasy-rankings") return <FantasyRankingsPage onSelectPlayer={onSelectPlayer} />;
    if (slug === "team-analytics") return <TeamAnalyticsPage />;
    if (slug === "fantasy-trends") return <FantasyTrendsPage onSelectPlayer={onSelectPlayer} />;
    const feature = ANALYTICS_FEATURES.find((f) => f.slug === slug);
    if (feature) return <ComingSoonDetail feature={feature} />;
  }

  return (
    <section className="panel" aria-labelledby="analytics-heading">
      <SectionHeader id="analytics-heading" title="Analytics" />
      <p className="lead">
        Season stats below come from the project's PostgreSQL database, so they show even on days
        with no games. More sections are planned below.
      </p>
      <SeasonStats />
      <div className="soon-grid">
        {ANALYTICS_FEATURES.map((f) => (
          <ComingSoonCard key={f.slug} feature={f} />
        ))}
      </div>
    </section>
  );
}
