import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook: flips `plan` in Supabase on subscription lifecycle events so
// gating limits change without a redeploy.
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch (err) {
    console.error("stripe webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = s.client_reference_id ?? s.metadata?.clerkUserId;
      if (supabase && clerkUserId) {
        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id:
              typeof s.customer === "string" ? s.customer : s.customer?.id,
            stripe_subscription_id:
              typeof s.subscription === "string" ? s.subscription : s.subscription?.id,
          })
          .eq("clerk_user_id", clerkUserId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ plan: active ? "pro" : "free" })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ plan: "free" })
          .eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
