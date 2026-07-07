"use client";

import { useEffect, useState } from "react";
import type { Position } from "./domain/types";

export interface MarksState {
  marks: Map<string, number>;
  live: boolean;
  loading: boolean;
}

// Fetches current option marks for a set of open option positions. Re-fetches
// when the set of contract keys changes.
export function useMarks(positions: Position[]): MarksState {
  const options = positions.filter(
    (p) => (p.kind === "csp" || p.kind === "cc") && p.status === "open" && p.strike,
  );
  const key = options
    .map((p) => `${p.id}:${p.symbol}:${p.strike}:${p.expiration}`)
    .join("|");

  const [state, setState] = useState<MarksState>({
    marks: new Map(),
    live: false,
    loading: options.length > 0,
  });

  useEffect(() => {
    if (options.length === 0) {
      setState({ marks: new Map(), live: false, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const items = options.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      strike: p.strike as number,
      expiration: p.expiration as string,
      optionType: p.kind === "csp" ? ("put" as const) : ("call" as const),
    }));
    fetch("/api/marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((r) => r.json())
      .then((data: { marks: Record<string, number>; live: boolean }) => {
        if (cancelled) return;
        setState({
          marks: new Map(Object.entries(data.marks ?? {})),
          live: !!data.live,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
