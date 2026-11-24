export function Loading({ label }: { label: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="state">{message}</div>;
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
