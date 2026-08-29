import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "./stripe";

export async function getOrCreateStripeCustomer(
  db: SupabaseClient,
  userId: string,
  email: string,
  stripe: Stripe,
) {
  const { data: profile } = await db.from("profiles").select("stripe_customer_id, full_name").eq("id", userId).single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name: profile?.full_name ?? undefined,
    metadata: { userId },
  });

  await db.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

export async function fulfillPurchase(
  db: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.userId;
  const contentId = session.metadata?.contentId;
  const paymentId = session.metadata?.paymentId;

  if (!userId || !contentId) throw new Error("Missing purchase metadata");

  const { data: content } = await db.from("content_items").select("title, purchases").eq("id", contentId).single();
  if (!content) throw new Error("Content not found");

  if (paymentId) {
    await db.from("payments").update({
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    }).eq("id", paymentId);
  } else {
    await db.from("payments").insert({
      user_id: userId,
      type: "purchase",
      description: content.title,
      amount: (session.amount_total ?? 0) / 100,
      status: "completed",
      content_id: contentId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    });
  }

  await db.from("user_library").upsert(
    { user_id: userId, content_id: contentId, progress: 0 },
    { onConflict: "user_id,content_id" },
  );

  await db.from("content_items").update({ purchases: (content.purchases ?? 0) + 1 }).eq("id", contentId);
}

export async function fulfillSubscription(
  db: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as SubscriptionPlan | undefined;
  const paymentId = session.metadata?.paymentId;

  if (!userId || !plan || !SUBSCRIPTION_PLANS[plan]) throw new Error("Missing subscription metadata");

  const planInfo = SUBSCRIPTION_PLANS[plan];
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  await db.from("subscriptions").update({ status: "cancelled" }).eq("user_id", userId).eq("status", "active");

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.from("subscriptions").insert({
    user_id: userId,
    plan,
    status: "active",
    price: planInfo.price,
    expires_at: expiresAt.toISOString(),
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
  });

  if (paymentId) {
    await db.from("payments").update({
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    }).eq("id", paymentId);
  } else {
    await db.from("payments").insert({
      user_id: userId,
      type: "subscription",
      description: `Suscripción ${planInfo.name} — Mensual`,
      amount: planInfo.price,
      status: "completed",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    });
  }

  if (stripeCustomerId) {
    await db.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", userId);
  }
}

export async function handleSubscriptionUpdated(db: SupabaseClient, subscription: Stripe.Subscription) {
  const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : "cancelled";
  await db.from("subscriptions").update({ status }).eq("stripe_subscription_id", subscription.id);
}

export async function handleSubscriptionDeleted(db: SupabaseClient, subscription: Stripe.Subscription) {
  await db.from("subscriptions").update({ status: "cancelled" }).eq("stripe_subscription_id", subscription.id);
}

export async function handlePaymentFailed(db: SupabaseClient, paymentIntent: Stripe.PaymentIntent) {
  const sessionId = paymentIntent.metadata?.checkoutSessionId;
  if (sessionId) {
    await db.from("payments").update({ status: "failed" }).eq("stripe_checkout_session_id", sessionId);
  }
}
