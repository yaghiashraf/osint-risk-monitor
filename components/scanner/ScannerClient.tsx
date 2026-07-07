"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store/context";
import {
  Badge,
  Button,
  DataNote,
  EmptyState,
  PageHeader,
  Panel,
  StatTile,
} from "@/components/ui";
import { fmtDate, fmtPct, fmtUsd, todayISO } from "@/lib/domain/format";
import { canTrackMorePositions } from "@/lib/domain/gating";
import { scannerRowLimit } from "@/lib/domain/gating";
import type { ScannerResult } from "@/lib/domain/scanner";

interface ScannerResponse {
  asOf: string;
  live: boolean;
  vix: number;
  vixRegime: string;
  vixBadge: string;
  deltaBand: [number, number];
  results: ScannerResult[];
}

export function ScannerClient() {
  const store = useStore();
  const { profile, positions } = store;
  const params = useSearchParams();
  const symbolFilter = (params.get("symbol") ?? "").toUpperCase();

  const [data, setData] = useState<ScannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/scanner")
      .then((r) => r.json())
      .then((d: ScannerResponse) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rowLimit = scannerRowLimit(profile);

  const filtered = useMemo(() => {
    const rows = data?.results ?? [];
    return symbolFilter ? rows.filter((r) => r.symbol === symbolFilter) : rows;
  }, [data, symbolFilter]);

  const visible = filtered.slice(0, rowLimit === Infinity ? undefined : rowLimit);
  const blurred = rowLimit === Infinity ? [] : filtered.slice(rowLimit);

  const track = (r: ScannerResult) => {
    if (!canTrackMorePositions(profile, positions)) return;
    const key = `${r.symbol}:${r.strike}:${r.expiration}`;
    store.addPosition({
      kind: "csp",
      status: "open",
      symbol: r.symbol,
      strike: r.strike,
      expiration: r.expiration,
      contracts: 1,
      premiumOpen: r.mid,
      deltaAtOpen: r.delta,
      openedAt: todayISO(),
    });
    setTracked((prev) => new Set(prev).add(key));
  };

  const vixTone =
    data?.vixRegime === "low" ? "cyan" : data?.vixRegime === "elevated" ? "amber" : "teal";

  return (
    <div>
      <PageHeader
        title="CSP Scanner"
        subtitle='House Rules preset · 30–45 DTE · quality + earnings filtered · min 3% ROC.'
        right={
          data && (
            <div className="flex items-center gap-2">
              <StatTile label="VIX" value={data.vix.toFixed(1)} tone={vixTone} />
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <DataNote live={!!data?.live} />
        <div className="flex items-center gap-2">
          {symbolFilter && (
            <Badge tone="cyan">
              Filtered: {symbolFilter}{" "}
              <Link href="/scanner" className="ml-1 underline">
                clear
              </Link>
            </Badge>
          )}
          {data && <Badge tone={vixTone}>{data.vixBadge}</Badge>}
          {data && (
            <span className="text-[11px] text-[var(--ink-faint)]">
              Delta {data.deltaBand[0].toFixed(2)}–{data.deltaBand[1].toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {loading && <div className="text-[var(--ink-muted)]">Scanning chains…</div>}
      {error && (
        <EmptyState text="Scanner failed to load. Check TRADIER_API_KEY or retry." />
      )}

      {data && !loading && filtered.length === 0 && (
        <EmptyState text="No contracts pass House Rules right now. Loosen the delta band or wait for richer premium." />
      )}

      {data && visible.length > 0 && (
        <Panel className="overflow-x-auto">
          <table className="wd-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Strike</th>
                <th>Exp (DTE)</th>
                <th>Delta</th>
                <th>Bid/Mid</th>
                <th>ROC</th>
                <th>Ann.</th>
                <th>Collateral</th>
                <th>OI</th>
                <th>Earnings</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const key = `${r.symbol}:${r.strike}:${r.expiration}`;
                const isTracked = tracked.has(key);
                const canAdd = canTrackMorePositions(profile, positions);
                return (
                  <tr key={key}>
                    <td className="font-semibold">{r.symbol}</td>
                    <td>{fmtUsd(r.strike, 0)}</td>
                    <td>
                      {fmtDate(r.expiration)}{" "}
                      <span className="text-[var(--ink-faint)]">({r.dte}d)</span>
                    </td>
                    <td>{r.delta.toFixed(2)}</td>
                    <td>
                      {fmtUsd(r.bid)}/{fmtUsd(r.mid)}
                    </td>
                    <td className="text-[var(--cyan)]">{fmtPct(r.roc, 1)}</td>
                    <td>{fmtPct(r.annualizedRoc, 0)}</td>
                    <td>{fmtUsd(r.collateral, 0)}</td>
                    <td>{r.openInterest.toLocaleString()}</td>
                    <td>
                      {r.nextEarnings ? (
                        <span
                          style={{
                            color: r.earningsWithin60d ? "var(--amber)" : undefined,
                          }}
                        >
                          {fmtDate(r.nextEarnings)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        {isTracked ? (
                          <Badge tone="teal">Tracked</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => track(r)}
                            disabled={!canAdd}
                            title={canAdd ? "Track this CSP" : "Free plan tracks 3 positions"}
                          >
                            Track
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {blurred.length > 0 && (
        <div className="relative mt-2">
          <div className="pointer-events-none select-none blur-[3px] opacity-50">
            <Panel className="overflow-hidden">
              <table className="wd-table">
                <tbody>
                  {blurred.slice(0, 6).map((r, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.symbol}</td>
                      <td>{fmtUsd(r.strike, 0)}</td>
                      <td>{fmtDate(r.expiration)}</td>
                      <td>{r.delta.toFixed(2)}</td>
                      <td>{fmtUsd(r.mid)}</td>
                      <td>{fmtPct(r.roc, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[13px] text-[var(--ink)]">
              {blurred.length} more results on Pro
            </span>
            <Button variant="primary" href="/settings">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
