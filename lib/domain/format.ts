// Formatting helpers. Numbers are tabular-nums everywhere in the UI; these
// keep the string formatting consistent across all three screens.

export function fmtUsd(n: number | undefined | null, digits = 2): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtNum(n: number | undefined | null, digits = 2): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// value is a fraction (0.03 -> "3.0%")
export function fmtPct(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function fmtDelta(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Math.abs(n).toFixed(2);
}

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// Whole-day difference from `from` to `to` (both ISO dates). Positive = future.
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(
    +from.slice(0, 4),
    +from.slice(5, 7) - 1,
    +from.slice(8, 10),
  );
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

// Days-to-expiration relative to `today` (defaults to now, UTC).
export function dte(expiration: string | undefined, today = todayISO()): number {
  if (!expiration) return 0;
  return daysBetween(today, expiration);
}
