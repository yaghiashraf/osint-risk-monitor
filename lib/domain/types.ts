// Core domain types for WheelDesk. These mirror the Supabase schema in
// supabase/schema.sql but are the source of truth used throughout the app
// (the localStorage store and the optional Supabase adapter both speak these).

export type Plan = "free" | "pro";

export type PositionKind = "csp" | "cc" | "stock";

export type PositionStatus =
  | "open"
  | "closed"
  | "assigned"
  | "called_away"
  | "expired";

export type AlertType =
  | "trap_50"
  | "earnings_collision"
  | "delta_drift"
  | "expiry_7d";

export interface Profile {
  id: string;
  clerkUserId: string;
  email?: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface Position {
  id: string;
  userId: string;
  kind: PositionKind;
  status: PositionStatus;
  symbol: string;

  // Option legs (null/undefined for kind === "stock")
  strike?: number;
  expiration?: string; // ISO date (YYYY-MM-DD)
  contracts?: number; // always positive; kind implies direction
  premiumOpen?: number; // per share, credit received
  premiumClose?: number; // per share, debit paid to close
  deltaAtOpen?: number;

  // Stock (null/undefined for option kinds)
  shares?: number;
  costBasis?: number; // per share, raw assignment basis (= assignment strike)

  // Linkage
  parentPositionId?: string; // CC -> its stock lot; stock -> the CSP that assigned it

  openedAt: string; // ISO date
  closedAt?: string; // ISO date
  notes?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  positionId?: string;
  type: AlertType;
  message: string;
  triggeredAt: string;
  dismissed: boolean;
}

export interface QualityRow {
  symbol: string;
  name?: string;
  passesQuality: boolean; // positive revenue, EPS, FCF (TTM)
  nextEarnings?: string; // ISO date
  updatedAt?: string;
}
