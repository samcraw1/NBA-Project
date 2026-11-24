import { useCallback, useEffect, useState } from "react";
import { getJson } from "../api";
import type { FetchState } from "../types";

type Core<T> = Pick<FetchState<T>, "data" | "loading" | "error">;

// Loads JSON from `url` and tracks loading/error state.
// Pass null to skip fetching. Changing `url` cancels the previous request.
export function useFetch<T>(url: string | null): FetchState<T> {
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

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
