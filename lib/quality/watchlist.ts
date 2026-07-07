// The seed universe for the CSP scanner. Fundamentals (passesQuality) are the
// hardcoded fallback used when no FMP key is present; the weekly cron refreshes
// them into Supabase when a key IS present. `iv` and `price` drive the mock
// market-data provider so the scanner is populated with zero API keys.

import type { QualityRow } from "../domain/types";

export interface WatchSymbol {
  symbol: string;
  name: string;
  passesQuality: boolean;
  price: number; // approximate underlying, for the mock provider
  iv: number; // annualized implied vol, for the mock provider
  earningsOffsetDays: number; // days from "today" to the next earnings print
}

// Prices/IVs are indicative and only feed the mock chain generator.
export const WATCHLIST: WatchSymbol[] = [
  { symbol: "AAPL", name: "Apple Inc.", passesQuality: true, price: 232, iv: 0.28, earningsOffsetDays: 25 },
  { symbol: "MSFT", name: "Microsoft Corp.", passesQuality: true, price: 470, iv: 0.26, earningsOffsetDays: 22 },
  { symbol: "GOOGL", name: "Alphabet Inc.", passesQuality: true, price: 188, iv: 0.3, earningsOffsetDays: 20 },
  { symbol: "AMZN", name: "Amazon.com Inc.", passesQuality: true, price: 205, iv: 0.32, earningsOffsetDays: 27 },
  { symbol: "META", name: "Meta Platforms", passesQuality: true, price: 640, iv: 0.36, earningsOffsetDays: 24 },
  { symbol: "NVDA", name: "NVIDIA Corp.", passesQuality: true, price: 148, iv: 0.55, earningsOffsetDays: 52 },
  { symbol: "TSLA", name: "Tesla Inc.", passesQuality: true, price: 340, iv: 0.62, earningsOffsetDays: 18 },
  { symbol: "AVGO", name: "Broadcom Inc.", passesQuality: true, price: 235, iv: 0.4, earningsOffsetDays: 70 },
  { symbol: "MU", name: "Micron Technology", passesQuality: true, price: 105, iv: 0.5, earningsOffsetDays: 80 },
  { symbol: "UNH", name: "UnitedHealth Group", passesQuality: true, price: 520, iv: 0.24, earningsOffsetDays: 33 },
  { symbol: "CVS", name: "CVS Health", passesQuality: true, price: 62, iv: 0.3, earningsOffsetDays: 40 },
  { symbol: "HOOD", name: "Robinhood Markets", passesQuality: true, price: 28, iv: 0.65, earningsOffsetDays: 36 },
  { symbol: "PLTR", name: "Palantir Technologies", passesQuality: true, price: 42, iv: 0.7, earningsOffsetDays: 29 },
  { symbol: "SHOP", name: "Shopify Inc.", passesQuality: true, price: 108, iv: 0.55, earningsOffsetDays: 44 },
  { symbol: "APP", name: "AppLovin Corp.", passesQuality: true, price: 320, iv: 0.68, earningsOffsetDays: 31 },
  { symbol: "INTC", name: "Intel Corp.", passesQuality: true, price: 21, iv: 0.45, earningsOffsetDays: 38 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", passesQuality: true, price: 585, iv: 0.15, earningsOffsetDays: 999 },
  { symbol: "GLD", name: "SPDR Gold Shares", passesQuality: true, price: 245, iv: 0.14, earningsOffsetDays: 999 },
  { symbol: "SLV", name: "iShares Silver Trust", passesQuality: true, price: 28, iv: 0.28, earningsOffsetDays: 999 },
  { symbol: "JPM", name: "JPMorgan Chase", passesQuality: true, price: 245, iv: 0.22, earningsOffsetDays: 15 },
  { symbol: "V", name: "Visa Inc.", passesQuality: true, price: 315, iv: 0.2, earningsOffsetDays: 30 },
  { symbol: "MA", name: "Mastercard Inc.", passesQuality: true, price: 520, iv: 0.21, earningsOffsetDays: 30 },
  { symbol: "COST", name: "Costco Wholesale", passesQuality: true, price: 940, iv: 0.19, earningsOffsetDays: 60 },
  { symbol: "HD", name: "Home Depot", passesQuality: true, price: 405, iv: 0.22, earningsOffsetDays: 47 },
  { symbol: "KO", name: "Coca-Cola Co.", passesQuality: true, price: 63, iv: 0.16, earningsOffsetDays: 26 },
  { symbol: "PG", name: "Procter & Gamble", passesQuality: true, price: 168, iv: 0.17, earningsOffsetDays: 21 },
  { symbol: "XOM", name: "Exxon Mobil", passesQuality: true, price: 112, iv: 0.24, earningsOffsetDays: 35 },
  { symbol: "ABBV", name: "AbbVie Inc.", passesQuality: true, price: 178, iv: 0.23, earningsOffsetDays: 28 },
  { symbol: "ORCL", name: "Oracle Corp.", passesQuality: true, price: 168, iv: 0.34, earningsOffsetDays: 55 },
  { symbol: "AMD", name: "Advanced Micro Devices", passesQuality: true, price: 128, iv: 0.52, earningsOffsetDays: 41 },
];

export const WATCHLIST_SYMBOLS = WATCHLIST.map((w) => w.symbol);

// Build the fallback quality list, computing next-earnings dates relative to a
// reference "today" so the earnings filter is exercisable without live data.
export function fallbackQualityList(today: string): QualityRow[] {
  return WATCHLIST.map((w) => ({
    symbol: w.symbol,
    name: w.name,
    passesQuality: w.passesQuality,
    nextEarnings:
      w.earningsOffsetDays >= 999 ? undefined : addDays(today, w.earningsOffsetDays),
    updatedAt: `${today}T00:00:00.000Z`,
  }));
}

export function fallbackQualityMap(today: string): Map<string, QualityRow> {
  return new Map(fallbackQualityList(today).map((q) => [q.symbol, q]));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
