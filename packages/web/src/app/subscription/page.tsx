"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Subscription } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function SubscriptionPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [plans, setPlans] = useState<Record<string, { name: string; price: number; features: string[] }>>({});
  const [current, setCurrent] = useState<Subscription | null>(null);

  useEffect(() => {
    api.subscriptions.plans().then(setPlans);
    const token = getToken();
    if (token) api.subscriptions.me(token).then(setCurrent).catch(() => setCurrent(null));
  }, [getToken]);

  const subscribe = async (plan: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const sub = await api.subscriptions.subscribe(plan, token);
      setCurrent(sub);
      toast.success("Suscripción activada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Suscripción" description="Elige el plan que mejor se adapte a ti" />
        {current && (
          <div className="card mb-6 border-primary">
            <p className="font-medium">Plan actual: {current.plan}</p>
            <p className="text-sm text-muted-foreground">Expira: {new Date(current.expires_at).toLocaleDateString("es-ES")}</p>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          {Object.entries(plans).map(([key, plan]) => (
            <div key={key} className={`card ${current?.plan === key ? "border-primary ring-2 ring-primary/20" : ""}`}>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
              <button onClick={() => subscribe(key)} className="btn-primary mt-6 w-full">
                {current?.plan === key ? "Plan actual" : "Suscribirse"}
              </button>
            </div>
          ))}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
