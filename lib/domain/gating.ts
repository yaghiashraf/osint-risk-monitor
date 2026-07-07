// Plan gating in ONE place. Don't scatter plan checks — import from here.

import type { Plan, Position, Profile } from "./types";

export const FREE_POSITION_LIMIT = 3;
export const FREE_SCANNER_ROWS = 10;

export function isPro(plan: Plan): boolean {
  return plan === "pro";
}

// Count only positions that occupy a "tracked" slot: open options and stock
// lots still held. Closed/expired/called-away positions don't count.
export function trackedPositionCount(positions: Position[]): number {
  return positions.filter(
    (p) =>
      p.status === "open" ||
      (p.kind === "stock" && p.status === "assigned"),
  ).length;
}

export function canTrackMorePositions(
  profile: Pick<Profile, "plan">,
  positions: Position[],
): boolean {
  if (isPro(profile.plan)) return true;
  return trackedPositionCount(positions) < FREE_POSITION_LIMIT;
}

export function positionsRemaining(
  profile: Pick<Profile, "plan">,
  positions: Position[],
): number | null {
  if (isPro(profile.plan)) return null; // unlimited
  return Math.max(0, FREE_POSITION_LIMIT - trackedPositionCount(positions));
}

export function scannerRowLimit(profile: Pick<Profile, "plan">): number {
  return isPro(profile.plan) ? Infinity : FREE_SCANNER_ROWS;
}
