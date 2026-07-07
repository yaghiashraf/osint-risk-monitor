// Desk-level aggregates and section splitting. Pure so the header stats bar and
// the cron can share the same math.

import type { Position } from "./types";
import {
  cspCollateral,
  cspRoc,
  premiumReceived,
  realizedOptionPl,
} from "./wheel";

export interface DeskStats {
  totalCollateral: number;
  openPremium: number;
  realizedMtd: number;
  realizedYtd: number;
  winRate: number | null; // null when no closed trades
  avgRoc: number | null; // avg realized ROC per closed option trade
  closedCount: number;
}

export function computeDeskStats(positions: Position[], today: string): DeskStats {
  const month = today.slice(0, 7); // YYYY-MM
  const year = today.slice(0, 4); // YYYY

  let totalCollateral = 0;
  let openPremium = 0;
  let realizedMtd = 0;
  let realizedYtd = 0;
  let wins = 0;
  let closed = 0;
  let rocSum = 0;
  let rocCount = 0;

  for (const p of positions) {
    const isOption = p.kind === "csp" || p.kind === "cc";

    if (p.status === "open" && p.kind === "csp") {
      totalCollateral += cspCollateral(p);
    }
    if (p.status === "open" && isOption) {
      openPremium += premiumReceived(p);
    }

    if (p.status === "closed" && isOption) {
      const pl = realizedOptionPl(p);
      if (pl !== undefined) {
        closed += 1;
        if (pl > 0) wins += 1;
        if (p.closedAt?.startsWith(year)) realizedYtd += pl;
        if (p.closedAt?.startsWith(month)) realizedMtd += pl;
        if (p.kind === "csp") {
          const col = cspCollateral(p);
          if (col > 0) {
            rocSum += pl / col;
            rocCount += 1;
          }
        }
      }
    }
  }

  return {
    totalCollateral,
    openPremium,
    realizedMtd,
    realizedYtd,
    winRate: closed > 0 ? wins / closed : null,
    avgRoc: rocCount > 0 ? rocSum / rocCount : null,
    closedCount: closed,
  };
}

export interface BadBankLot {
  lot: Position;
  coveredCalls: Position[];
}

// Good Bank = open income CSPs. Bad Bank = held stock lots + their CCs.
export function splitBanks(positions: Position[]): {
  goodBank: Position[];
  badBank: BadBankLot[];
} {
  const goodBank = positions.filter(
    (p) => p.kind === "csp" && p.status === "open",
  );
  const lots = positions.filter(
    (p) => p.kind === "stock" && (p.status === "assigned" || p.status === "open"),
  );
  const badBank: BadBankLot[] = lots.map((lot) => ({
    lot,
    coveredCalls: positions.filter(
      (p) => p.kind === "cc" && p.parentPositionId === lot.id && p.status === "open",
    ),
  }));
  return { goodBank, badBank };
}

// Also expose per-CSP ROC for the row (used by the Desk table).
export function rowRoc(p: Position): number {
  return cspRoc(p);
}
