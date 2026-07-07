"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store/context";
import { useMarks } from "@/lib/hooks";
import {
  Badge,
  Button,
  DataNote,
  EmptyState,
  PageHeader,
  Panel,
  SectionLabel,
  StatTile,
} from "@/components/ui";
import { Field, Modal, TextInput } from "@/components/Modal";
import { AddPositionForm } from "./AddPositionForm";
import {
  fmtDate,
  fmtNum,
  fmtPct,
  fmtUsd,
  dte,
  todayISO,
} from "@/lib/domain/format";
import {
  capturedFraction,
  cspCollateral,
  isTrapped,
  premiumReceived,
  cspRoc,
  adjustedBasis,
  premiumsCollectedOnLot,
} from "@/lib/domain/wheel";
import { computeDeskStats, splitBanks } from "@/lib/domain/desk";
import { evaluateAlerts } from "@/lib/domain/alerts";
import { canTrackMorePositions, positionsRemaining } from "@/lib/domain/gating";
import { fallbackQualityMap } from "@/lib/quality/watchlist";
import type { Position } from "@/lib/domain/types";

export function DeskClient() {
  const store = useStore();
  const { positions, profile, ready } = store;
  const today = todayISO();

  const { marks, live } = useMarks(positions);
  const [addOpen, setAddOpen] = useState(false);
  const [closing, setClosing] = useState<Position | null>(null);

  const quality = useMemo(() => fallbackQualityMap(today), [today]);
  const stats = useMemo(() => computeDeskStats(positions, today), [positions, today]);
  const { goodBank, badBank } = useMemo(() => splitBanks(positions), [positions]);

  const alerts = useMemo(() => {
    const all = evaluateAlerts({ positions, marks, quality, today });
    return all.filter((a) => !store.dismissedAlertIds.includes(a.id));
  }, [positions, marks, quality, today, store.dismissedAlertIds]);

  const canAdd = canTrackMorePositions(profile, positions);
  const remaining = positionsRemaining(profile, positions);

  if (!ready) {
    return <div className="text-[var(--ink-muted)]">Loading desk…</div>;
  }

  const empty = positions.length === 0;

  return (
    <div>
      <PageHeader
        title="Position Desk"
        subtitle="Track open CSPs and repair assigned lots. The Trap System watches for 50% profit."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => (canAdd ? setAddOpen(true) : undefined)}
              disabled={!canAdd}
              title={canAdd ? "Track a position" : "Free plan tracks 3 positions"}
            >
              + Track
            </Button>
            {empty ? (
              <Button variant="primary" onClick={store.loadDemo}>
                Load demo positions
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={store.reset}>
                Clear
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <DataNote live={live} />
        {remaining !== null && (
          <span className="text-[11px] text-[var(--ink-faint)]">
            Free plan · {remaining} of 3 position slots left ·{" "}
            <Link href="/settings" className="text-[var(--cyan)]">
              Upgrade
            </Link>
          </span>
        )}
      </div>

      {/* Header stats */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Collateral" value={fmtUsd(stats.totalCollateral, 0)} />
        <StatTile label="Open premium" value={fmtUsd(stats.openPremium, 0)} tone="cyan" />
        <StatTile
          label="Realized MTD"
          value={fmtUsd(stats.realizedMtd, 0)}
          tone={stats.realizedMtd >= 0 ? "teal" : "coral"}
        />
        <StatTile
          label="Realized YTD"
          value={fmtUsd(stats.realizedYtd, 0)}
          tone={stats.realizedYtd >= 0 ? "teal" : "coral"}
        />
        <StatTile
          label="Win rate"
          value={stats.winRate === null ? "—" : fmtPct(stats.winRate, 0)}
          sub={`${stats.closedCount} closed`}
        />
        <StatTile
          label="Avg ROC"
          value={stats.avgRoc === null ? "—" : fmtPct(stats.avgRoc, 1)}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-1.5">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 border-l-2 bg-[var(--surface)] px-3 py-2"
              style={{ borderColor: alertColor(a.type) }}
            >
              <div className="flex items-center gap-2">
                <Badge tone={alertTone(a.type)}>{alertLabel(a.type)}</Badge>
                <span className="text-[12px] text-[var(--ink)]">{a.message}</span>
              </div>
              <div className="flex items-center gap-2">
                {a.type === "delta_drift" && a.positionId && (
                  <Button
                    size="sm"
                    tone="magenta"
                    href={`/repair/preload?csp=${a.positionId}`}
                  >
                    Repair plan
                  </Button>
                )}
                <button
                  onClick={() => store.dismissAlert(a.id)}
                  className="text-[11px] text-[var(--ink-faint)] hover:text-[var(--ink)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {empty && (
        <EmptyState
          text="No positions yet. Load the demo to see a Trap alert and a full repair plan in one click, or track your own."
          cta={
            <div className="flex gap-2">
              <Button variant="primary" onClick={store.loadDemo}>
                Load demo positions
              </Button>
              <Button variant="default" onClick={() => setAddOpen(true)}>
                + Track a position
              </Button>
            </div>
          }
        />
      )}

      {/* Good Bank */}
      {goodBank.length > 0 && (
        <section className="mb-8">
          <SectionLabel tone="cyan" note="open CSPs — income generation">
            Good Bank
          </SectionLabel>
          <Panel className="overflow-x-auto">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Strike</th>
                  <th>Exp (DTE)</th>
                  <th>Credit</th>
                  <th>Mark</th>
                  <th>P/L of max</th>
                  <th>ROC</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {goodBank.map((p) => {
                  const mark = marks.get(p.id);
                  const captured =
                    mark !== undefined
                      ? capturedFraction(p.premiumOpen ?? 0, mark)
                      : undefined;
                  const trapped =
                    mark !== undefined && isTrapped(p.premiumOpen ?? 0, mark);
                  const d = dte(p.expiration, today);
                  return (
                    <tr
                      key={p.id}
                      style={
                        trapped
                          ? { boxShadow: "inset 2px 0 0 var(--amber)" }
                          : undefined
                      }
                    >
                      <td className="font-semibold">{p.symbol}</td>
                      <td>{fmtUsd(p.strike, 0)}</td>
                      <td>
                        {fmtDate(p.expiration)}{" "}
                        <span className="text-[var(--ink-faint)]">({d}d)</span>
                      </td>
                      <td>
                        {fmtUsd(p.premiumOpen)} × {p.contracts}
                      </td>
                      <td>{mark !== undefined ? fmtUsd(mark) : "—"}</td>
                      <td
                        style={{
                          color:
                            captured === undefined
                              ? undefined
                              : captured >= 0
                                ? "var(--teal)"
                                : "var(--coral)",
                        }}
                      >
                        {captured !== undefined ? fmtPct(captured, 0) : "—"}
                      </td>
                      <td>{fmtPct(cspRoc(p), 1)}</td>
                      <td>
                        {trapped ? (
                          <Badge tone="amber" solid>
                            TRAP
                          </Badge>
                        ) : (
                          <span className="text-[var(--ink-faint)]">open</span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setClosing(p)}>
                            Close
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => store.assignPosition(p.id)}
                            title="Convert to an assigned stock lot"
                          >
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" href={`/scanner?symbol=${p.symbol}`}>
                            Roll
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </section>
      )}

      {/* Bad Bank */}
      {badBank.length > 0 && (
        <section className="mb-8">
          <SectionLabel tone="magenta" note="assigned stock + covered calls — repair mode">
            Bad Bank
          </SectionLabel>
          <div className="space-y-3">
            {badBank.map(({ lot, coveredCalls }) => {
              const adj = adjustedBasis(lot, positions);
              const collected = premiumsCollectedOnLot(lot, positions);
              return (
                <Panel key={lot.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[15px] font-semibold">{lot.symbol}</span>{" "}
                        <span className="text-[12px] text-[var(--ink-muted)]">
                          {fmtNum(lot.shares, 0)} sh
                        </span>
                      </div>
                      <div className="text-[12px] text-[var(--ink-muted)]">
                        Raw basis{" "}
                        <span className="tnum text-[var(--ink)]">{fmtUsd(lot.costBasis)}</span>
                      </div>
                      <div className="text-[12px] text-[var(--ink-muted)]">
                        Collected{" "}
                        <span className="tnum text-[var(--teal)]">{fmtUsd(collected, 0)}</span>
                      </div>
                      <div className="text-[12px] text-[var(--ink-muted)]">
                        Adjusted basis{" "}
                        <span className="tnum text-[var(--cyan)]">{fmtUsd(adj)}</span>
                      </div>
                    </div>
                    <Button variant="primary" tone="magenta" size="sm" href={`/repair/${lot.id}`}>
                      Open Repair Engine →
                    </Button>
                  </div>

                  {coveredCalls.length > 0 && (
                    <table className="wd-table mt-3">
                      <thead>
                        <tr>
                          <th>Covered call</th>
                          <th>Strike</th>
                          <th>Exp (DTE)</th>
                          <th>Credit</th>
                          <th>Mark</th>
                          <th>P/L of max</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {coveredCalls.map((cc) => {
                          const mark = marks.get(cc.id);
                          const captured =
                            mark !== undefined
                              ? capturedFraction(cc.premiumOpen ?? 0, mark)
                              : undefined;
                          return (
                            <tr key={cc.id}>
                              <td className="text-[var(--magenta)]">CC</td>
                              <td>{fmtUsd(cc.strike, 0)}</td>
                              <td>
                                {fmtDate(cc.expiration)}{" "}
                                <span className="text-[var(--ink-faint)]">
                                  ({dte(cc.expiration, today)}d)
                                </span>
                              </td>
                              <td>
                                {fmtUsd(cc.premiumOpen)} × {cc.contracts}
                              </td>
                              <td>{mark !== undefined ? fmtUsd(mark) : "—"}</td>
                              <td>{captured !== undefined ? fmtPct(captured, 0) : "—"}</td>
                              <td>
                                <div className="flex justify-end">
                                  <Button size="sm" variant="ghost" onClick={() => setClosing(cc)}>
                                    Close
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Panel>
              );
            })}
          </div>
        </section>
      )}

      <AddPositionForm open={addOpen} onClose={() => setAddOpen(false)} />
      <ClosePositionModal position={closing} onClose={() => setClosing(null)} />
    </div>
  );
}

function ClosePositionModal({
  position,
  onClose,
}: {
  position: Position | null;
  onClose: () => void;
}) {
  const { closePosition } = useStore();
  const [debit, setDebit] = useState("");
  if (!position) return null;
  const credit = position.premiumOpen ?? 0;
  const debitN = Number(debit) || 0;
  const realized = (credit - debitN) * 100 * (position.contracts ?? 0);
  return (
    <Modal open onClose={onClose} title={`Close ${position.symbol} $${position.strike}`}>
      <p className="mb-3 text-[12px] text-[var(--ink-muted)]">
        Enter the debit paid per share to buy this option back. Credit received was{" "}
        <span className="tnum text-[var(--ink)]">{fmtUsd(credit)}</span>.
      </p>
      <Field label="Closing debit / share">
        <TextInput
          type="number"
          value={debit}
          onChange={(e) => setDebit(e.target.value)}
          placeholder="0.40"
          autoFocus
        />
      </Field>
      <div className="mb-3 text-[12px]">
        Realized P/L:{" "}
        <span
          className="tnum font-semibold"
          style={{ color: realized >= 0 ? "var(--teal)" : "var(--coral)" }}
        >
          {fmtUsd(realized)}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            closePosition(position.id, debitN);
            onClose();
          }}
        >
          Confirm close
        </Button>
      </div>
    </Modal>
  );
}

function alertColor(type: string): string {
  switch (type) {
    case "trap_50":
      return "var(--amber)";
    case "earnings_collision":
      return "var(--magenta)";
    case "delta_drift":
      return "var(--coral)";
    default:
      return "var(--cyan)";
  }
}
function alertTone(type: string): "amber" | "magenta" | "coral" | "cyan" {
  switch (type) {
    case "trap_50":
      return "amber";
    case "earnings_collision":
      return "magenta";
    case "delta_drift":
      return "coral";
    default:
      return "cyan";
  }
}
function alertLabel(type: string): string {
  switch (type) {
    case "trap_50":
      return "Trap 50%";
    case "earnings_collision":
      return "Earnings";
    case "delta_drift":
      return "Delta drift";
    case "expiry_7d":
      return "7 DTE";
    default:
      return type;
  }
}
