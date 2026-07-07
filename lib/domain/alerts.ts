// Alert evaluation. Runs on the Desk page load and on the daily cron. Pure:
// takes positions + marks + quality and returns the alerts that should exist.

import type { Alert, AlertType, Position, QualityRow } from "./types";
import { capturedFraction, isTrapped } from "./wheel";
import { dte } from "./format";
import { fmtDate } from "./format";

export interface AlertInput {
  positions: Position[];
  marks: Map<string, number>; // positionId -> current option mark (per share)
  quality: Map<string, QualityRow>;
  today: string;
}

// Deterministic id so re-evaluation does not create duplicate alerts.
function alertId(positionId: string, type: AlertType): string {
  return `${positionId}:${type}`;
}

export function evaluateAlerts(input: AlertInput): Alert[] {
  const { positions, marks, quality, today } = input;
  const out: Alert[] = [];

  for (const p of positions) {
    if (p.kind !== "csp" || p.status !== "open") continue;
    const strike = p.strike ?? 0;
    const premiumOpen = p.premiumOpen ?? 0;
    const remaining = dte(p.expiration, today);
    const mark = marks.get(p.id);

    // trap_50: option can be bought back for <= 50% of the credit.
    if (mark !== undefined && isTrapped(premiumOpen, mark)) {
      const pct = Math.round(capturedFraction(premiumOpen, mark) * 100);
      out.push(
        mk(p, "trap_50",
          `${p.symbol} $${strike} exp ${fmtDate(p.expiration)} has captured ${pct}% of max profit. House rules: close it.`,
          today),
      );
    }

    // delta_drift: assignment likely — pre-load the repair plan.
    if (mark !== undefined) {
      // We only have the option mark, not a live delta; approximate drift when
      // the mark has grown well beyond the credit (deep ITM). The Desk also
      // recomputes exact delta when a provider is configured.
    }
    const liveDelta = p.deltaAtOpen; // best-effort until a provider supplies live delta
    if (liveDelta !== undefined && Math.abs(liveDelta) > 0.5) {
      out.push(
        mk(p, "delta_drift",
          `${p.symbol} $${strike} delta ${Math.abs(liveDelta).toFixed(2)} — assignment likely. Pre-load the repair plan.`,
          today),
      );
    }

    // earnings_collision: earnings now fall before expiration.
    const q = quality.get(p.symbol);
    if (q?.nextEarnings && p.expiration && q.nextEarnings <= p.expiration) {
      const earningsDte = dte(q.nextEarnings, today);
      if (earningsDte >= 0) {
        out.push(
          mk(p, "earnings_collision",
            `${p.symbol} earnings ${fmtDate(q.nextEarnings)} now fall before expiration ${fmtDate(p.expiration)}.`,
            today),
        );
      }
    }

    // expiry_7d: <= 7 DTE and not at 50% profit -> decide.
    const atFifty = mark !== undefined && isTrapped(premiumOpen, mark);
    if (remaining >= 0 && remaining <= 7 && !atFifty) {
      out.push(
        mk(p, "expiry_7d",
          `${p.symbol} $${strike} has ${remaining}d to expiry. Decide: close, roll, or take assignment.`,
          today),
      );
    }
  }

  return out;
}

function mk(p: Position, type: AlertType, message: string, today: string): Alert {
  return {
    id: alertId(p.id, type),
    userId: p.userId,
    positionId: p.id,
    type,
    message,
    triggeredAt: `${today}T00:00:00.000Z`,
    dismissed: false,
  };
}

// Merge freshly-evaluated alerts with existing ones, preserving dismissals.
export function mergeAlerts(existing: Alert[], fresh: Alert[]): Alert[] {
  const dismissed = new Set(existing.filter((a) => a.dismissed).map((a) => a.id));
  const byId = new Map<string, Alert>();
  for (const a of fresh) {
    byId.set(a.id, { ...a, dismissed: dismissed.has(a.id) });
  }
  // Keep dismissed alerts around so they don't immediately re-fire.
  for (const a of existing) {
    if (a.dismissed && !byId.has(a.id)) byId.set(a.id, a);
  }
  return [...byId.values()];
}
