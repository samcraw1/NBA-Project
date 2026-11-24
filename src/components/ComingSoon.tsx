import type { AnalyticsFeature } from "../analytics";

export function ComingSoonBadge() {
  return <span className="badge badge-soon">Coming soon</span>;
}

export function ComingSoonCard({ feature }: { feature: AnalyticsFeature }) {
  return (
    <a className="soon-card" href={`#/analytics/${feature.slug}`}>
      <ComingSoonBadge />
      <h3>{feature.title}</h3>
      <p>{feature.summary}</p>
    </a>
  );
}

export function ComingSoonDetail({ feature }: { feature: AnalyticsFeature }) {
  return (
    <section className="panel" aria-labelledby="feature-heading">
      <p className="crumbs">
        <a className="link" href="#/analytics">← Analytics</a>
      </p>
      <div className="section-header">
        <h2 id="feature-heading">{feature.title}</h2>
        <ComingSoonBadge />
      </div>
      <p className="lead">{feature.summary}</p>
      <div className="placeholder" aria-hidden="true" />
      <h3 className="card-subtitle">What this needs first</h3>
      <ul className="needs">
        {feature.needs.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="note">
        No numbers are shown here on purpose. This section appears once the backend can serve real
        data for it.
      </p>
    </section>
  );
}
