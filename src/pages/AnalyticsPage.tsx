import { ANALYTICS_FEATURES } from "../analytics";
import { ComingSoonCard, ComingSoonDetail } from "../components/ComingSoon";
import { SeasonStats } from "../components/SeasonStats";
import { SectionHeader } from "../components/SectionHeader";

export function AnalyticsPage({ slug }: { slug?: string }) {
  if (slug) {
    const feature = ANALYTICS_FEATURES.find((f) => f.slug === slug);
    if (feature) return <ComingSoonDetail feature={feature} />;
  }

  return (
    <section className="panel" aria-labelledby="analytics-heading">
      <SectionHeader id="analytics-heading" title="Analytics" />
      <p className="lead">
        Season stats below come from the project's PostgreSQL database, so they show even on days
        with no games. The sections after them still need more pipeline work and are marked coming soon.
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
