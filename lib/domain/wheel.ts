// The math IS the product. Everything here is pure so it can be unit-reasoned
// and reused by both the client screens and the server cron.

import type { Position } from "./types";
import { dte } from "./format";

export const ANNUALIZE_DAYS = 365;

// ---- Cash-secured put economics -----------------------------------------

export function cspCollateral(p: Position): number {
  const strike = p.strike ?? 0;
  const contracts = p.contracts ?? 0;
  return strike * 100 * contracts;
}

export function premiumReceived(p: Position): number {
  const prem = p.premiumOpen ?? 0;
  const contracts = p.contracts ?? 0;
  return prem * 100 * contracts;
}

// ROC on a CSP: premium received / collateral (per-trade, as a fraction).
export function cspRoc(p: Position): number {
  const strike = p.strike ?? 0;
  if (strike <= 0) return 0;
  return (p.premiumOpen ?? 0) / strike;
}

// Annualize a per-trade ROC over its day count.
export function annualize(roc: number, days: number): number {
  if (days <= 0) return 0;
  return roc * (ANNUALIZE_DAYS / days);
}

export function cspAnnualizedRoc(p: Position, today?: string): number {
  const days = Math.max(1, dte(p.expiration, today));
  return annualize(cspRoc(p), days);
}

// Fraction of max profit captured given the current option mark.
// max profit on a short put = the full credit; you buy it back at `mark`.
export function capturedFraction(premiumOpen: number, mark: number): number {
  if (premiumOpen <= 0) return 0;
  return Math.max(0, 1 - mark / premiumOpen);
}

// The Trap System: fires when the option can be bought back for <= 50% of
// the credit received. "House rules: close it."
export function isTrapped(premiumOpen: number, mark: number): boolean {
  if (premiumOpen <= 0) return false;
  return mark <= 0.5 * premiumOpen;
}

// Realized P/L (dollars) once a short option is closed for `premiumClose`.
export function realizedOptionPl(p: Position): number | undefined {
  if (p.premiumClose === undefined || p.premiumOpen === undefined) return undefined;
  const contracts = p.contracts ?? 0;
  return (p.premiumOpen - p.premiumClose) * 100 * contracts;
}

// ---- Assignment ----------------------------------------------------------

// When a CSP is assigned you buy 100 shares/contract at the strike.
// We store the raw assignment basis as the strike itself; the CSP premium is
// carried forward as a "premium collected on the lot" so the Repair Engine's
// adjusted-basis math (raw - sum(premiums)/shares) does not double count it.
export function assignmentBasis(csp: Position): number {
  return csp.strike ?? 0;
}

export function assignmentShares(csp: Position): number {
  return (csp.contracts ?? 0) * 100;
}

// ---- Repair Engine -------------------------------------------------------

// Sum of every premium credited against a stock lot: the CSP that assigned it
// plus all covered calls written on it (net of any debit paid to close them).
export function premiumsCollectedOnLot(
  lot: Position,
  all: Position[],
): number {
  let total = 0;
  // The CSP that assigned into this lot (lot.parentPositionId -> that CSP).
  const csp = all.find((x) => x.id === lot.parentPositionId && x.kind === "csp");
  if (csp) total += premiumReceived(csp);
  // Every covered call linked back to this lot.
  for (const cc of all) {
    if (cc.kind === "cc" && cc.parentPositionId === lot.id) {
      const contracts = cc.contracts ?? 0;
      total += (cc.premiumOpen ?? 0) * 100 * contracts;
      if (cc.premiumClose !== undefined) {
        total -= cc.premiumClose * 100 * contracts;
      }
    }
  }
  return total;
}

// adjusted_basis = raw_cost_basis - (sum of premiums collected / shares)
export function adjustedBasis(lot: Position, all: Position[]): number {
  const shares = lot.shares ?? 0;
  if (shares <= 0) return lot.costBasis ?? 0;
  return (lot.costBasis ?? 0) - premiumsCollectedOnLot(lot, all) / shares;
}

export interface RepairCandidate {
  strike: number;
  premium: number; // per share, mid
  delta: number;
  expiration: string;
  dte: number;
  oi: number;
  earningsInWindow: boolean;
  // Derived:
  newAdjustedBasisIfWorthless: number;
  totalPlIfCalledAway: number;
  rocOnStock: number; // fraction, premium / current price
  annualizedRoc: number; // fraction
  repairEtaMonths: number | null; // null = already at/above breakeven
  respectsBasis: boolean;
}

export interface RepairInputs {
  shares: number;
  adjustedBasis: number;
  currentPrice: number;
  neverCapBelowBasis: boolean; // house rule (default on)
}

// Naive repair ETA: months of repeated CCs at this premium to grind the
// adjusted basis down to the current price, assuming flat price + repeatable
// premium. Clearly an estimate.
export function repairEtaMonths(
  adjBasis: number,
  currentPrice: number,
  premiumPerShare: number,
  candidateDte: number,
): number | null {
  if (adjBasis <= currentPrice) return null; // already repaired
  const perMonth = premiumPerShare / (candidateDte / 30);
  if (perMonth <= 0) return null;
  return (adjBasis - currentPrice) / perMonth;
}

export function buildRepairCandidate(
  chainRow: {
    strike: number;
    premium: number;
    delta: number;
    expiration: string;
    oi: number;
    earningsInWindow: boolean;
  },
  inputs: RepairInputs,
  today?: string,
): RepairCandidate {
  const { strike, premium, delta, expiration, oi, earningsInWindow } = chainRow;
  const d = Math.max(1, dte(expiration, today));
  const shares = inputs.shares;
  const contracts = shares / 100;

  const newAdjustedBasisIfWorthless = inputs.adjustedBasis - premium;
  const totalPlIfCalledAway =
    (strike - inputs.adjustedBasis) * shares + premium * 100 * contracts;
  const rocOnStock =
    inputs.currentPrice > 0 ? premium / inputs.currentPrice : 0;
  const annualizedRoc = annualize(rocOnStock, d);
  const eta = repairEtaMonths(
    inputs.adjustedBasis,
    inputs.currentPrice,
    premium,
    d,
  );

  // "Never cap below basis": only suggest strikes >= adjusted basis.
  // "Aggressive": allow below-basis strikes if call-away still nets positive.
  const respectsBasis = inputs.neverCapBelowBasis
    ? strike >= inputs.adjustedBasis
    : totalPlIfCalledAway > 0;

  return {
    strike,
    premium,
    delta,
    expiration,
    dte: d,
    oi,
    earningsInWindow,
    newAdjustedBasisIfWorthless,
    totalPlIfCalledAway,
    rocOnStock,
    annualizedRoc,
    repairEtaMonths: eta,
    respectsBasis,
  };
}

// Desk pick: highest annualized premium among strikes that (a) respect the
// basis constraint, (b) delta <= 0.30, (c) no earnings collision.
// Tie-break: shorter repair ETA.
export function pickDeskRow(candidates: RepairCandidate[]): RepairCandidate | null {
  const eligible = candidates.filter(
    (c) => c.respectsBasis && Math.abs(c.delta) <= 0.3 && !c.earningsInWindow,
  );
  if (eligible.length === 0) return null;
  return eligible.slice().sort((a, b) => {
    if (Math.abs(b.annualizedRoc - a.annualizedRoc) > 1e-9) {
      return b.annualizedRoc - a.annualizedRoc;
    }
    const ea = a.repairEtaMonths ?? Infinity;
    const eb = b.repairEtaMonths ?? Infinity;
    return ea - eb;
  })[0];
}

// Projected adjusted basis over N cycles at a fixed premium (flat-price model)
// vs the current price. This is the shareable Repair chart.
export function projectRepair(
  startAdjustedBasis: number,
  currentPrice: number,
  premiumPerShare: number,
  cycles = 6,
): { cycle: number; adjustedBasis: number; price: number }[] {
  const out: { cycle: number; adjustedBasis: number; price: number }[] = [];
  for (let i = 0; i <= cycles; i++) {
    out.push({
      cycle: i,
      adjustedBasis: +(startAdjustedBasis - premiumPerShare * i).toFixed(2),
      price: currentPrice,
    });
  }
  return out;
}
