"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store/context";
import {
  Badge,
  Button,
  DataNote,
  PageHeader,
  Panel,
  SectionLabel,
  StatTile,
} from "@/components/ui";
import { RepairChart } from "./RepairChart";
import {
  adjustedBasis as calcAdjustedBasis,
  assignmentBasis,
  assignmentShares,
  buildRepairCandidate,
  pickDeskRow,
  premiumReceived,
  premiumsCollectedOnLot,
  type RepairCandidate,
} from "@/lib/domain/wheel";
import { fmtDate, fmtNum, fmtPct, fmtUsd, todayISO } from "@/lib/domain/format";
import type { Position } from "@/lib/domain/types";

interface ChainRow {
  strike: number;
  premium: number;
  delta: number;
  expiration: string;
  oi: number;
  earningsInWindow: boolean;
}

interface ChainResponse {
  symbol: string;
  price: number;
  live: boolean;
  nextEarnings?: string;
  calls: ChainRow[];
}

// Works in two modes: an existing stock lot (lotId) or a pre-load preview from a
// CSP that is likely to be assigned (previewCsp).
export function RepairEngineClient({
  lotId,
  previewCsp,
}: {
  lotId?: string;
  previewCsp?: string;
}) {
  const store = useStore();
  const { positions, ready } = store;

  const lot = lotId ? positions.find((p) => p.id === lotId) : undefined;
  const csp = previewCsp ? positions.find((p) => p.id === previewCsp) : undefined;

  // Resolve the subject of the repair.
  const subject = useMemo(() => {
    if (lot && lot.kind === "stock") {
      return {
        symbol: lot.symbol,
        shares: lot.shares ?? 0,
        rawBasis: lot.costBasis ?? 0,
        collected: premiumsCollectedOnLot(lot, positions),
        preview: false as const,
      };
    }
    if (csp && csp.kind === "csp") {
      return {
        symbol: csp.symbol,
        shares: assignmentShares(csp),
        rawBasis: assignmentBasis(csp),
        collected: premiumReceived(csp),
        preview: true as const,
      };
    }
    return null;
  }, [lot, csp, positions]);

  // Editable inputs (auto-filled from the position).
  const [shares, setShares] = useState(0);
  const [rawBasis, setRawBasis] = useState(0);
  const [collected, setCollected] = useState(0);
  const [price, setPrice] = useState<number | null>(null);
  const [neverCap, setNeverCap] = useState(true);
  const [includeEarnings, setIncludeEarnings] = useState(false);
  const [chain, setChain] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subject) return;
    setShares(subject.shares);
    setRawBasis(subject.rawBasis);
    setCollected(subject.collected);
  }, [subject]);

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/repair/chain?symbol=${encodeURIComponent(subject.symbol)}`)
      .then((r) => r.json())
      .then((d: ChainResponse) => {
        if (cancelled) return;
        setChain(d);
        setPrice((prev) => (prev === null ? d.price : prev));
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [subject]);

  const adjusted = shares > 0 ? rawBasis - collected / shares : rawBasis;
  const currentPrice = price ?? 0;

  const candidates: RepairCandidate[] = useMemo(() => {
    if (!chain) return [];
    const today = todayISO();
    return chain.calls
      .map((row) =>
        buildRepairCandidate(row, {
          shares,
          adjustedBasis: adjusted,
          currentPrice,
          neverCapBelowBasis: neverCap,
        }, today),
      )
      .filter((c) => c.strike >= currentPrice) // never write below the market
      .filter((c) => (includeEarnings ? true : !c.earningsInWindow))
      .filter((c) => c.respectsBasis)
      .sort((a, b) => a.strike - b.strike);
  }, [chain, shares, adjusted, currentPrice, neverCap, includeEarnings]);

  const deskPick = useMemo(() => pickDeskRow(candidates), [candidates]);
  const chartPremium = deskPick?.premium ?? candidates[0]?.premium ?? 0;
  const underwater = adjusted > currentPrice;

  if (!ready) return <div className="text-[var(--ink-muted)]">Loading…</div>;
  if (!subject)
    return (
      <div>
        <PageHeader title="Repair Engine" />
        <p className="text-[var(--ink-muted)]">
          No stock lot found. Open the Repair Engine from a Bad Bank lot on the{" "}
          <a href="/desk" className="text-[var(--cyan)]">
            Desk
          </a>
          .
        </p>
      </div>
    );

  return (
    <div>
      <PageHeader
        title={`Repair — ${subject.symbol}`}
        subtitle="Work your cost basis down without capping the recovery. Tracking only — execute at your broker."
        right={
          <StatTile
            label="Adjusted basis"
            value={fmtUsd(adjusted)}
            tone={underwater ? "coral" : "teal"}
            sub={underwater ? "underwater" : "at/above breakeven"}
          />
        }
      />

      {subject.preview && (
        <div className="mb-4 border-l-2 border-[var(--coral)] bg-[var(--surface)] px-3 py-2 text-[12px]">
          <Badge tone="coral">Pre-load</Badge>{" "}
          <span className="text-[var(--ink-muted)]">
            Assignment likely on this CSP. This is a projected plan — assign it on the Desk to
            start tracking covered calls.
          </span>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <DataNote live={!!chain?.live} />
        {chain?.nextEarnings && (
          <span className="text-[11px] text-[var(--ink-faint)]">
            Next earnings {fmtDate(chain.nextEarnings)}
          </span>
        )}
      </div>

      {/* Inputs */}
      <Panel className="mb-6 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumInput label="Shares" value={shares} onChange={setShares} step={100} />
          <NumInput label="Raw basis / sh" value={rawBasis} onChange={setRawBasis} step={0.5} />
          <NumInput
            label="Premiums collected"
            value={collected}
            onChange={setCollected}
            step={10}
          />
          <NumInput label="Current price" value={currentPrice} onChange={setPrice} step={0.5} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Toggle
            label="Never cap below basis"
            desc="Only suggest strikes ≥ adjusted basis (house rule)"
            on={neverCap}
            onToggle={() => setNeverCap((v) => !v)}
          />
          <Toggle
            label="Include earnings-window strikes"
            desc="Off by default — earnings inside the trade window"
            on={includeEarnings}
            onToggle={() => setIncludeEarnings((v) => !v)}
          />
        </div>
      </Panel>

      {/* Desk pick + chart */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionLabel tone="teal">Desk pick</SectionLabel>
          {deskPick ? (
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-[24px] font-semibold tnum">
                  {fmtUsd(deskPick.strike, 0)} call
                </span>
                <Badge tone="teal">{fmtPct(deskPick.annualizedRoc, 0)} ann.</Badge>
                <span className="text-[13px] text-[var(--ink-muted)] tnum">
                  {fmtUsd(deskPick.premium)} · Δ{deskPick.delta.toFixed(2)} ·{" "}
                  {fmtDate(deskPick.expiration)}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
                Highest annualized premium respecting your basis rule, Δ≤0.30, no earnings
                collision.{" "}
                {deskPick.repairEtaMonths !== null ? (
                  <>
                    Est.{" "}
                    <span className="text-[var(--ink)]">
                      {fmtNum(deskPick.repairEtaMonths, 1)} months
                    </span>{" "}
                    of repeated CCs to reach breakeven (flat-price estimate).
                  </>
                ) : (
                  <>Adjusted basis is already at/below the market.</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-[var(--ink-muted)]">
              No strike satisfies the constraints. Try Aggressive repair or include earnings.
            </p>
          )}
        </Panel>
        <Panel className="p-4">
          <SectionLabel tone="cyan" note="6-cycle projection at the picked premium">
            Basis repair path
          </SectionLabel>
          <RepairChart
            adjustedBasis={adjusted}
            currentPrice={currentPrice}
            premiumPerShare={chartPremium}
          />
        </Panel>
      </div>

      {/* Ladder */}
      <SectionLabel tone="magenta" note="30–45 DTE covered-call chain">
        Repair ladder
      </SectionLabel>
      {loading && <div className="text-[var(--ink-muted)]">Loading chain…</div>}
      {!loading && candidates.length === 0 && (
        <p className="text-[13px] text-[var(--ink-muted)]">
          No candidate strikes in the 30–45 DTE window under the current constraints.
        </p>
      )}
      {candidates.length > 0 && (
        <Panel className="overflow-x-auto">
          <table className="wd-table">
            <thead>
              <tr>
                <th>Strike</th>
                <th>Premium</th>
                <th>Delta</th>
                <th>New basis</th>
                <th>P/L if called</th>
                <th>ROC</th>
                <th>Ann.</th>
                <th>Repair ETA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const isPick = deskPick && c.strike === deskPick.strike && c.expiration === deskPick.expiration;
                return (
                  <tr
                    key={`${c.strike}:${c.expiration}`}
                    style={isPick ? { background: "rgba(0,201,167,0.08)" } : undefined}
                  >
                    <td className="font-semibold">
                      {fmtUsd(c.strike, 0)}
                      {isPick && (
                        <span className="ml-1.5">
                          <Badge tone="teal" solid>
                            PICK
                          </Badge>
                        </span>
                      )}
                      {c.earningsInWindow && (
                        <span className="ml-1.5">
                          <Badge tone="magenta">ER</Badge>
                        </span>
                      )}
                    </td>
                    <td>{fmtUsd(c.premium)}</td>
                    <td>{Math.abs(c.delta).toFixed(2)}</td>
                    <td className="text-[var(--cyan)]">{fmtUsd(c.newAdjustedBasisIfWorthless)}</td>
                    <td
                      style={{ color: c.totalPlIfCalledAway >= 0 ? "var(--teal)" : "var(--coral)" }}
                    >
                      {fmtUsd(c.totalPlIfCalledAway, 0)}
                    </td>
                    <td>{fmtPct(c.rocOnStock, 1)}</td>
                    <td>{fmtPct(c.annualizedRoc, 0)}</td>
                    <td>
                      {c.repairEtaMonths === null ? "—" : `≈${fmtNum(c.repairEtaMonths, 1)} mo`}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          tone="magenta"
                          disabled={subject.preview}
                          title={
                            subject.preview
                              ? "Assign the stock first on the Desk"
                              : "Track this covered call"
                          }
                          onClick={() => {
                            if (subject.preview || !lot) return;
                            store.sellCoveredCall(lot.id, {
                              strike: c.strike,
                              expiration: c.expiration,
                              premium: c.premium,
                              contracts: Math.round(shares / 100),
                              delta: c.delta,
                            });
                          }}
                        >
                          Sell this CC
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
      <p className="mt-3 text-[11px] text-[var(--ink-faint)]">
        Tracking only — execute at your broker. Repair ETA assumes a flat price and repeatable
        premium; treat it as a rough estimate.
      </p>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg)] px-2 py-1.5 text-[13px] tnum outline-none focus:border-[var(--cyan)]"
      />
    </label>
  );
}

function Toggle({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="flex items-start gap-2 text-left">
      <span
        className="mt-0.5 inline-flex h-4 w-7 items-center rounded-full p-0.5 transition-colors"
        style={{ background: on ? "var(--teal)" : "var(--border-strong)" }}
      >
        <span
          className="h-3 w-3 rounded-full bg-black transition-transform"
          style={{ transform: on ? "translateX(12px)" : "translateX(0)" }}
        />
      </span>
      <span>
        <span className="block text-[12px] text-[var(--ink)]">{label}</span>
        <span className="block text-[10px] text-[var(--ink-faint)]">{desc}</span>
      </span>
    </button>
  );
}
