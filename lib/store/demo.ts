// Demo seed: 3 open CSPs (one deliberately trapped) + 1 underwater INTC stock
// lot with its assigning CSP, so the Repair Engine is showable instantly.
// Definition of done: load this and see a Trap alert + a full repair plan.

import type { Position } from "../domain/types";
import { todayISO } from "../domain/format";
import { uid } from "./ids";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildDemoPositions(userId: string, today = todayISO()): Position[] {
  const now = new Date().toISOString();
  const mk = (p: Partial<Position>): Position => ({
    id: uid("pos"),
    userId,
    kind: "csp",
    status: "open",
    symbol: "",
    openedAt: today,
    createdAt: now,
    ...p,
  });

  // --- Good Bank: three open CSPs -----------------------------------------
  // PLTR is set up to be TRAPPED (high credit vs. a now-cheap mark).
  const pltr = mk({
    kind: "csp",
    symbol: "PLTR",
    strike: 38,
    expiration: addDays(today, 18),
    contracts: 2,
    premiumOpen: 2.5,
    deltaAtOpen: 0.28,
    openedAt: addDays(today, -22),
    notes: "Demo — likely at 50% profit target",
  });

  const amd = mk({
    kind: "csp",
    symbol: "AMD",
    strike: 115,
    expiration: addDays(today, 35),
    contracts: 1,
    premiumOpen: 3.2,
    deltaAtOpen: 0.25,
    openedAt: addDays(today, -7),
  });

  const ko = mk({
    kind: "csp",
    symbol: "KO",
    strike: 60,
    expiration: addDays(today, 40),
    contracts: 3,
    premiumOpen: 0.55,
    deltaAtOpen: 0.2,
    openedAt: addDays(today, -5),
  });

  // --- Bad Bank: an underwater INTC lot + the CSP that assigned it ---------
  const intcCsp = mk({
    kind: "csp",
    status: "assigned",
    symbol: "INTC",
    strike: 25,
    expiration: addDays(today, -20),
    contracts: 2,
    premiumOpen: 1.0,
    deltaAtOpen: 0.45,
    openedAt: addDays(today, -55),
    closedAt: addDays(today, -20),
    notes: "Demo — assigned; now repairing",
  });

  const intcLot = mk({
    kind: "stock",
    status: "assigned",
    symbol: "INTC",
    strike: undefined,
    expiration: undefined,
    contracts: undefined,
    premiumOpen: undefined,
    deltaAtOpen: undefined,
    shares: 200,
    costBasis: 25, // raw assignment basis = strike; CSP premium carried on lot
    parentPositionId: intcCsp.id,
    openedAt: addDays(today, -20),
  });

  return [pltr, amd, ko, intcCsp, intcLot];
}
