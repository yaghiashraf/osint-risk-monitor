import { NextResponse } from "next/server";
import { getServiceClient, supabaseEnabled } from "@/lib/supabase/server";
import { getProvider } from "@/lib/marketdata";
import { evaluateAlerts } from "@/lib/domain/alerts";
import { fallbackQualityMap } from "@/lib/quality/watchlist";
import { todayISO } from "@/lib/domain/format";
import type { Position } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily Vercel cron (10:00 ET). Re-evaluates Trap/earnings/delta/expiry alerts
// for every open CSP and upserts them. No-op (but 200) when Supabase isn't
// configured — in demo mode alerts are computed client-side on the Desk.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!supabaseEnabled) {
    return NextResponse.json({
      ok: true,
      skipped: "Supabase not configured — alerts run client-side in demo mode.",
    });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ ok: true, skipped: "no client" });

  const today = todayISO();
  const provider = getProvider();
  const quality = fallbackQualityMap(today);

  const { data: rows } = await supabase
    .from("positions")
    .select("*")
    .eq("kind", "csp")
    .eq("status", "open");

  const positions = (rows ?? []) as unknown as Position[];

  // Fetch marks per contract.
  const marks = new Map<string, number>();
  await Promise.all(
    positions.map(async (p) => {
      if (!p.strike || !p.expiration) return;
      const m = await provider
        .getOptionMark(p.symbol, p.strike, p.expiration, "put")
        .catch(() => undefined);
      if (m !== undefined) marks.set(p.id, m);
    }),
  );

  const alerts = evaluateAlerts({ positions, marks, quality, today });

  let written = 0;
  for (const a of alerts) {
    const { error } = await supabase.from("alerts").upsert(
      {
        id: a.id,
        user_id: a.userId,
        position_id: a.positionId,
        type: a.type,
        message: a.message,
        triggered_at: a.triggeredAt,
        dismissed: false,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (!error) written += 1;
  }

  return NextResponse.json({ ok: true, evaluated: positions.length, written });
}
