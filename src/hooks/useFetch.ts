import { useCallback, useEffect, useState } from "react";
import { getJson } from "../api";
import type { FetchState } from "../types";

type Core<T> = Pick<FetchState<T>, "data" | "loading" | "error">;

// Loads JSON from `url` and tracks loading/error state.
// Pass null to skip fetching. Changing `url` cancels the previous request.
//
// refreshMs re-fetches in the background on a timer: a number of milliseconds, or a function of
// the latest data (so a page can poll faster while games are live). Polling is silent: it keeps
// showing the current data (no spinner), keeps it if a poll fails, and skips while the tab is hidden.
export function useFetch<T>(
  url: string | null,
  refreshMs: number | ((data: T | null) => number | null) | null = null,
): FetchState<T> {
  const [state, setState] = useState<Core<T>>({ data: null, loading: url !== null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (url === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    getJson<T>(url, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // a newer request replaced this one
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => controller.abort();
  }, [url, attempt]);

  const delay = typeof refreshMs === "function" ? refreshMs(state.data) : refreshMs;

  useEffect(() => {
    if (url === null || delay === null) return;
    let controller: AbortController | null = null;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      getJson<T>(url, current.signal)
        .then((data) => {
          if (!current.signal.aborted) setState({ data, loading: false, error: null });
        })
        .catch(() => {
          // Keep showing the last good data; the next tick tries again.
        });
    }, delay);
    return () => {
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [url, delay]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
