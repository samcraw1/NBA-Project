import { ANALYTICS_FEATURES } from "../analytics";
import { ComingSoonCard, ComingSoonDetail } from "../components/ComingSoon";
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
        Today's live data is available now. The sections below need historical data and a data
        pipeline first, so they're marked coming soon.
      </p>
      <div className="soon-grid">
        {ANALYTICS_FEATURES.map((f) => (
          <ComingSoonCard key={f.slug} feature={f} />
        ))}
      </div>
    </section>
  );
}
