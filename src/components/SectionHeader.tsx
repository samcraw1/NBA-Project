import type { ReactNode } from "react";

export function SectionHeader({
  id,
  title,
  action,
}: {
  id: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <h2 id={id}>{title}</h2>
      {action}
    </div>
  );
}
