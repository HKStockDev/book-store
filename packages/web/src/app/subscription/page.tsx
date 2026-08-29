"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { PLAN_LABELS, PLAN_ORDER, SUBSCRIPTION_PLANS, type SubscriptionPlanInfo } from "@/lib/subscription-plans";
import type { Subscription } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export default function SubscriptionPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [plans, setPlans] = useState<Record<string, SubscriptionPlanInfo>>(SUBSCRIPTION_PLANS);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.subscriptions.plans().then(setPlans).catch(() => setPlans(SUBSCRIPTION_PLANS));
    const token = getToken();
    if (token) {
      api.subscriptions.me(token)
        .then(setCurrent)
        .catch(() => setCurrent(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [getToken]);

  const subscribe = async (plan: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const { url } = await api.stripe.checkoutSubscription(plan, token);
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar pago");
    }
  };

  const activePlan = current ? plans[current.plan] : null;
  const activePlanLabel = current ? (PLAN_LABELS[current.plan] ?? activePlan?.name ?? current.plan) : null;

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Suscripción" description="Elige el plan que mejor se adapte a ti" />

        {!loading && current && activePlan && (
          <div className="mb-8 rounded-xl border-2 border-primary bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Plan activo
                </span>
                <h2 className="mt-3 flex items-center gap-2 text-xl font-bold">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {activePlanLabel}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(current.price)}/mes · Renueva el{" "}
                  {new Date(current.expires_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-primary/15 pt-5">
              <p className="text-sm font-semibold text-foreground">Tus beneficios actuales</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {activePlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = plans[key];
            if (!plan) return null;
            const isActive = current?.plan === key;

            return (
              <div
                key={key}
                className={cn(
                  "card relative flex flex-col transition-shadow",
                  isActive && "border-2 border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
                )}
              >
                {isActive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    Plan activo
                  </span>
                )}

                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>

                <div className="mt-5 flex-1">
                  <p className="text-sm font-semibold text-muted-foreground">Beneficios incluidos</p>
                  <ul className="mt-3 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className={cn(isActive && "font-medium")}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isActive && current && (
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Activo hasta{" "}
                    {new Date(current.expires_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}

                <button
                  onClick={() => !isActive && subscribe(key)}
                  disabled={isActive}
                  className={cn(
                    "mt-4 w-full",
                    isActive ? "btn-ghost cursor-default opacity-80" : "btn-primary",
                  )}
                >
                  {isActive ? (
                    <span className="inline-flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Plan actual
                    </span>
                  ) : (
                    "Suscribirse"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
