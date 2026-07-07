import { NextResponse } from "next/server";
import { getStripe, PRICES, stripeEnabled } from "@/lib/stripe";
import { getServerUserId } from "@/lib/auth";

export const runtime = "nodejs";

// Creates a Stripe Checkout session for the Pro plan (monthly or annual).
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !stripeEnabled) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs." },
      { status: 400 },
    );
  }

  const { interval } = (await req.json().catch(() => ({}))) as {
    interval?: "monthly" | "annual";
  };
  const price = interval === "annual" ? PRICES.annual : PRICES.monthly;
  if (!price) {
    return NextResponse.json({ error: "Price ID not configured." }, { status: 400 });
  }

  const userId = (await getServerUserId()) ?? "anonymous";
  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    metadata: { clerkUserId: userId },
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/settings`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
