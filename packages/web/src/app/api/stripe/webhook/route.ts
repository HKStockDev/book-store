import { headers } from "next/headers";
import { getAdminClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import {
  fulfillPurchase,
  fulfillSubscription,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return Response.json({ error: message }, { status: 400 });
  }

  const db = getAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;
        const type = session.metadata?.type;
        if (type === "purchase") await fulfillPurchase(db, session);
        else if (type === "subscription") await fulfillSubscription(db, session);
        break;
      }
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(db, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(db, event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Stripe webhook error:", message);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ received: true });
}
