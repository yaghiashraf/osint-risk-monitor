// FMP fundamentals: positive revenue + EPS + free cash flow (TTM) => passes.
// Falls back to the hardcoded quality flag when no key is present or a call
// fails, so the scanner's quality filter always has an answer.

import { WATCHLIST, type WatchSymbol } from "./watchlist";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

interface FmpQuality {
  symbol: string;
  passesQuality: boolean;
  nextEarnings?: string;
}

async function fmpJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function assessSymbol(w: WatchSymbol, key: string): Promise<FmpQuality> {
  const [income, cash] = await Promise.all([
    fmpJson<{ revenue: number; eps: number }[]>(
      `${FMP_BASE}/income-statement/${w.symbol}?period=annual&limit=1&apikey=${key}`,
    ),
    fmpJson<{ freeCashFlow: number }[]>(
      `${FMP_BASE}/cash-flow-statement/${w.symbol}?period=annual&limit=1&apikey=${key}`,
    ),
  ]);

  if (!income?.[0]) {
    // ETFs / no fundamentals: keep the hardcoded default.
    return { symbol: w.symbol, passesQuality: w.passesQuality };
  }
  const rev = income[0].revenue ?? 0;
  const eps = income[0].eps ?? 0;
  const fcf = cash?.[0]?.freeCashFlow ?? 0;
  return { symbol: w.symbol, passesQuality: rev > 0 && eps > 0 && fcf > 0 };
}

// Refresh quality flags for the whole watchlist via FMP. Returns null if no key.
export async function refreshQualityViaFmp(): Promise<FmpQuality[] | null> {
  const key = process.env.FMP_API_KEY;
  if (!key || !key.trim()) return null;
  const out: FmpQuality[] = [];
  // Sequential to stay under FMP free-tier rate limits.
  for (const w of WATCHLIST) {
    out.push(await assessSymbol(w, key));
  }
  return out;
}
