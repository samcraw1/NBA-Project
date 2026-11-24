import { useMemo, useState } from "react";
import { formatDuration, periodLabel } from "../format";
import type { Play } from "../types";

const PAGE_SIZE = 100;

export function PlayByPlay({ plays }: { plays: Play[] }) {
  const [period, setPeriod] = useState<number | "all">("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // A play "scores" when the running score changed since the previous play.
  const rows = useMemo(
    () => plays.map((p, i) => ({ ...p, scoring: i > 0 && p.score !== plays[i - 1].score })),
    [plays],
  );
  const periods = useMemo(() => [...new Set(plays.map((p) => p.period))], [plays]);

  const filtered = rows.filter((r) => period === "all" || r.period === period);
  const ordered = newestFirst ? [...filtered].reverse() : filtered;
  const visible = ordered.slice(0, limit);

  const choosePeriod = (next: number | "all") => {
    setPeriod(next);
    setLimit(PAGE_SIZE);
  };

  return (
    <div>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by period">
          <button type="button" className="chip" aria-pressed={period === "all"} onClick={() => choosePeriod("all")}>
            All
          </button>
          {periods.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={period === p} onClick={() => choosePeriod(p)}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setNewestFirst(!newestFirst)}>
          {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
        </button>
      </div>

      <ol className="timeline">
        {visible.map((p, i) => (
          <li key={`${p.period}-${p.clock}-${i}`} className={p.scoring ? "play play-scoring" : "play"}>
            <span className="when">
              <strong>{periodLabel(p.period)}</strong> {formatDuration(p.clock)}
            </span>
            <span className="what">{p.description}</span>
            <span className="play-score">{p.score}</span>
          </li>
        ))}
      </ol>

      {ordered.length > visible.length && (
        <button type="button" className="btn btn-ghost expand" onClick={() => setLimit(limit + PAGE_SIZE)}>
          Show more ({ordered.length - visible.length} remaining)
        </button>
      )}
    </div>
  );
}
