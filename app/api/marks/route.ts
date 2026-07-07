import { NextResponse } from "next/server";
import { getProvider, providerIsLive } from "@/lib/marketdata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MarkRequest {
  id: string;
  symbol: string;
  strike: number;
  expiration: string;
  optionType: "put" | "call";
}

// Returns the current (delayed) mark per share for a batch of option contracts,
// keyed by the caller's position id. Used by the Desk to compute trap status.
export async function POST(req: Request) {
  const provider = getProvider();
  let items: MarkRequest[] = [];
  try {
    const body = (await req.json()) as { items?: MarkRequest[] };
    items = body.items ?? [];
  } catch {
    return NextResponse.json({ marks: {}, live: providerIsLive() });
  }

  const marks: Record<string, number> = {};
  await Promise.all(
    items.map(async (it) => {
      try {
        const mark = await provider.getOptionMark(
          it.symbol,
          it.strike,
          it.expiration,
          it.optionType,
        );
        if (mark !== undefined) marks[it.id] = mark;
      } catch {
        /* skip unknown marks */
      }
    }),
  );

  return NextResponse.json({ marks, live: providerIsLive() });
}
