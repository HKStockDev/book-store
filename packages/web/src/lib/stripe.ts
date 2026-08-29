import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

export const SUBSCRIPTION_PLANS = {
  basic: { name: "IWWEI Básica", price: 4.99 },
  premium: { name: "IWWEI Premium", price: 9.99 },
  family: { name: "IWWEI Familiar", price: 14.99 },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
