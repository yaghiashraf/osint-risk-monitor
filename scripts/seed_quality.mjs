// Seeds the Supabase `quality_list` table with the scanner universe.
// Usage: node scripts/seed_quality.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env).
//
// NOTE: lib/quality/watchlist.ts is the app's source of truth for the universe.
// This list is kept in sync for the standalone seed (no TS runtime needed).

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const WATCHLIST = [
  ["AAPL", "Apple Inc.", 25],
  ["MSFT", "Microsoft Corp.", 22],
  ["GOOGL", "Alphabet Inc.", 20],
  ["AMZN", "Amazon.com Inc.", 27],
  ["META", "Meta Platforms", 24],
  ["NVDA", "NVIDIA Corp.", 52],
  ["TSLA", "Tesla Inc.", 18],
  ["AVGO", "Broadcom Inc.", 70],
  ["MU", "Micron Technology", 80],
  ["UNH", "UnitedHealth Group", 33],
  ["CVS", "CVS Health", 40],
  ["HOOD", "Robinhood Markets", 36],
  ["PLTR", "Palantir Technologies", 29],
  ["SHOP", "Shopify Inc.", 44],
  ["APP", "AppLovin Corp.", 31],
  ["INTC", "Intel Corp.", 38],
  ["SPY", "SPDR S&P 500 ETF", null],
  ["GLD", "SPDR Gold Shares", null],
  ["SLV", "iShares Silver Trust", null],
  ["JPM", "JPMorgan Chase", 15],
  ["V", "Visa Inc.", 30],
  ["MA", "Mastercard Inc.", 30],
  ["COST", "Costco Wholesale", 60],
  ["HD", "Home Depot", 47],
  ["KO", "Coca-Cola Co.", 26],
  ["PG", "Procter & Gamble", 21],
  ["XOM", "Exxon Mobil", 35],
  ["ABBV", "AbbVie Inc.", 28],
  ["ORCL", "Oracle Corp.", 55],
  ["AMD", "Advanced Micro Devices", 41],
];

function addDays(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = WATCHLIST.map(([symbol, name, earningsOffset]) => ({
    symbol,
    name,
    passes_quality: true,
    next_earnings: earningsOffset === null ? null : addDays(earningsOffset),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("quality_list")
    .upsert(rows, { onConflict: "symbol" });
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} symbols into quality_list.`);
}

main();
