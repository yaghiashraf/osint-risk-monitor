// Optional Stripe client. Single Pro product with monthly + annual prices.
import Stripe from "stripe";

export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripeEnabled) return null;
  if (stripe) return stripe;
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return stripe;
}

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  annual: process.env.STRIPE_PRICE_ID_ANNUAL,
};

export const PRICE_LABELS = {
  monthly: "$39 / month",
  annual: "$349 / year",
};
