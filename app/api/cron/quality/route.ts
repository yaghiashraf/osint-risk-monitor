import { NextResponse } from "next/server";
import { getServiceClient, supabaseEnabled } from "@/lib/supabase/server";
import { refreshQualityViaFmp } from "@/lib/quality/fmp";
import { fallbackQualityList } from "@/lib/quality/watchlist";
import { todayISO } from "@/lib/domain/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly cron: refresh quality_list fundamentals from FMP (if a key is present)
// and upsert into Supabase. Without Supabase it just reports what it would do.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const today = todayISO();
  const fallback = fallbackQualityList(today);
  const fmp = await refreshQualityViaFmp();
  const overrides = new Map((fmp ?? []).map((f) => [f.symbol, f.passesQuality]));

  const rows = fallback.map((q) => ({
    symbol: q.symbol,
    name: q.name,
    passes_quality: overrides.has(q.symbol)
      ? (overrides.get(q.symbol) as boolean)
      : q.passesQuality,
    next_earnings: q.nextEarnings,
    updated_at: new Date().toISOString(),
  }));

  if (!supabaseEnabled) {
    return NextResponse.json({
      ok: true,
      usedFmp: !!fmp,
      skipped: "Supabase not configured — nothing persisted.",
      count: rows.length,
    });
  }

  const supabase = getServiceClient();
  const { error } = await supabase!.from("quality_list").upsert(rows, {
    onConflict: "symbol",
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, usedFmp: !!fmp, count: rows.length });
}
