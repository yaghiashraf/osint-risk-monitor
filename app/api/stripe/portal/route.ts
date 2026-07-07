import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase/server";
import { getServerUserId } from "@/lib/auth";

export const runtime = "nodejs";

// Opens the Stripe customer portal so users can cancel or update their card.
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !stripeEnabled) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  const userId = await getServerUserId();
  const supabase = getServiceClient();
  let customerId: string | undefined;
  if (supabase && userId) {
    const { data } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    customerId = data?.stripe_customer_id ?? undefined;
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file yet — complete a checkout first." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings`,
  });
  return NextResponse.json({ url: session.url });
}
