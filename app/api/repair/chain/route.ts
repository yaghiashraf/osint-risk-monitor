import { NextResponse } from "next/server";
import { getProvider, providerIsLive } from "@/lib/marketdata";
import { fallbackQualityMap } from "@/lib/quality/watchlist";
import { todayISO } from "@/lib/domain/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the covered-call chain (30-45 DTE) for a stock lot's symbol, plus the
// live underlying price and an earnings-in-window flag per strike. Feeds the
// Assignment Repair Engine's ladder.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const provider = getProvider();
  const today = todayISO();
  const quality = fallbackQualityMap(today);
  const nextEarnings = quality.get(symbol)?.nextEarnings;

  const [price, calls] = await Promise.all([
    provider.getQuote(symbol),
    provider.getCallChain(symbol, 30, 45),
  ]);

  const rows = calls.map((c) => ({
    strike: c.strike,
    premium: c.mid,
    delta: c.delta,
    expiration: c.expiration,
    oi: c.openInterest,
    earningsInWindow:
      !!nextEarnings && nextEarnings >= today && nextEarnings <= c.expiration,
  }));

  return NextResponse.json({
    symbol,
    price,
    live: providerIsLive(),
    nextEarnings,
    calls: rows,
  });
}
