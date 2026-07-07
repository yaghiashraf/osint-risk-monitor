// CSP Scanner "House Rules" — the flagship preset. Pure filtering + scoring so
// the same rules run on the server route and are inspectable in tests.

import type { QualityRow } from "./types";
import { annualize } from "./wheel";
import { dte, daysBetween } from "./format";

export interface HouseRules {
  dteMin: number;
  dteMax: number;
  deltaMin: number;
  deltaMax: number;
  minRoc: number; // fraction (0.03 = 3%)
  qualityFilter: boolean;
  earningsFilter: boolean;
  minOpenInterest: number;
  maxSpreadPctOfMid: number; // 0.10 = 10%
}

export const HOUSE_RULES: HouseRules = {
  dteMin: 30,
  dteMax: 45,
  deltaMin: 0.1,
  deltaMax: 0.35,
  minRoc: 0.03,
  qualityFilter: true,
  earningsFilter: true,
  minOpenInterest: 100,
  maxSpreadPctOfMid: 0.1,
};

export type VixRegime = "low" | "normal" | "elevated";

export interface VixAdjustment {
  regime: VixRegime;
  deltaMin: number;
  deltaMax: number;
  badge: string;
}

// VIX adjustment to the delta band + a badge explaining the posture.
export function vixAdjustment(vix: number): VixAdjustment {
  if (vix < 15) {
    return {
      regime: "low",
      deltaMin: 0.1,
      deltaMax: 0.2,
      badge: "Low vol — stay conservative",
    };
  }
  if (vix <= 25) {
    return {
      regime: "normal",
      deltaMin: 0.15,
      deltaMax: 0.3,
      badge: "Normal vol",
    };
  }
  return {
    regime: "elevated",
    deltaMin: 0.15,
    deltaMax: 0.35,
    badge: "Elevated vol — premium rich",
  };
}

// A single put contract as returned by the market-data provider.
export interface PutContract {
  symbol: string;
  strike: number;
  expiration: string; // ISO date
  delta: number; // negative for puts; we use abs
  bid: number;
  ask: number;
  mid: number;
  openInterest: number;
  underlyingPrice: number;
}

export interface ScannerResult {
  symbol: string;
  name?: string;
  strike: number;
  expiration: string;
  dte: number;
  delta: number; // absolute
  bid: number;
  mid: number;
  roc: number; // fraction
  annualizedRoc: number; // fraction
  collateral: number;
  openInterest: number;
  nextEarnings?: string;
  earningsWithin60d: boolean;
}

export interface ScanContext {
  today: string;
  quality: Map<string, QualityRow>;
  rules: HouseRules;
}

// Apply House Rules to a set of put contracts. Returns qualifying rows sorted
// by ROC descending (the scanner default).
export function runScanner(
  contracts: PutContract[],
  ctx: ScanContext,
): ScannerResult[] {
  const { today, quality, rules } = ctx;
  const out: ScannerResult[] = [];

  for (const c of contracts) {
    const q = quality.get(c.symbol);

    // Quality filter: only symbols that pass fundamentals.
    if (rules.qualityFilter && !(q && q.passesQuality)) continue;

    const d = dte(c.expiration, today);
    if (d < rules.dteMin || d > rules.dteMax) continue;

    const absDelta = Math.abs(c.delta);
    if (absDelta < rules.deltaMin || absDelta > rules.deltaMax) continue;

    // Liquidity floor.
    if (c.openInterest < rules.minOpenInterest) continue;
    const spread = c.ask - c.bid;
    if (c.mid <= 0 || spread / c.mid > rules.maxSpreadPctOfMid) continue;

    // Earnings filter: no earnings inside the trade window.
    if (rules.earningsFilter && q?.nextEarnings) {
      if (daysBetween(today, q.nextEarnings) >= 0 && q.nextEarnings <= c.expiration) {
        continue;
      }
    }

    const roc = c.strike > 0 ? c.mid / c.strike : 0;
    if (roc < rules.minRoc) continue;

    const earningsWithin60d =
      !!q?.nextEarnings &&
      daysBetween(today, q.nextEarnings) >= 0 &&
      daysBetween(today, q.nextEarnings) <= 60;

    out.push({
      symbol: c.symbol,
      name: q?.name,
      strike: c.strike,
      expiration: c.expiration,
      dte: d,
      delta: absDelta,
      bid: c.bid,
      mid: c.mid,
      roc,
      annualizedRoc: annualize(roc, Math.max(1, d)),
      collateral: c.strike * 100,
      openInterest: c.openInterest,
      nextEarnings: q?.nextEarnings,
      earningsWithin60d,
    });
  }

  out.sort((a, b) => b.roc - a.roc);
  return out;
}
