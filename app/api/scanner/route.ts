import { NextResponse } from "next/server";
import { getProvider, providerIsLive } from "@/lib/marketdata";
import {
  HOUSE_RULES,
  runScanner,
  vixAdjustment,
  type PutContract,
} from "@/lib/domain/scanner";
import { fallbackQualityMap, WATCHLIST_SYMBOLS } from "@/lib/quality/watchlist";
import { todayISO } from "@/lib/domain/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Runs the "House Rules" scanner across the seed universe. VIX-adjusts the delta
// band, then applies quality/earnings/liquidity/ROC filters. Provider results
// are cached 15 min upstream.
export async function GET() {
  const provider = getProvider();
  const today = todayISO();
  const quality = fallbackQualityMap(today);

  const vix = await provider.getVix();
  const vadj = vixAdjustment(vix);
  const rules = {
    ...HOUSE_RULES,
    deltaMin: vadj.deltaMin,
    deltaMax: vadj.deltaMax,
  };

  const chains = await Promise.all(
    WATCHLIST_SYMBOLS.map((sym) =>
      provider
        .getPutChain(sym, rules.dteMin, rules.dteMax)
        .catch(() => [] as PutContract[]),
    ),
  );
  const contracts = chains.flat();
  const results = runScanner(contracts, { today, quality, rules });

  return NextResponse.json({
    asOf: new Date().toISOString(),
    live: providerIsLive(),
    vix,
    vixRegime: vadj.regime,
    vixBadge: vadj.badge,
    deltaBand: [vadj.deltaMin, vadj.deltaMax],
    results,
  });
}
