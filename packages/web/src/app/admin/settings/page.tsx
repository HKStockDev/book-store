"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminSettingsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) api.settings.platform(token).then((r) => setSettings(r as Record<string, unknown>)).catch(console.error);
  }, [getToken]);

  return (
    <>
        <PageHeader title="Configuración" description="Ajustes de plataforma e integraciones" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h3 className="mb-4 font-semibold">Monetización CPM</h3>
            <p className="text-sm">Tarifa CPM por defecto: <strong>{String(settings?.cpmDefaultRate ?? "2.50")}€</strong></p>
          </div>
          <div className="card">
            <h3 className="mb-4 font-semibold">Integraciones</h3>
            <ul className="space-y-2 text-sm">
              <li>Apryse (visor documental): {(settings?.integrations as { apryse?: { enabled: boolean } })?.apryse?.enabled ? "✓ Configurado" : "-"}</li>
              <li>Taddy (cómics/podcasts): {(settings?.integrations as { taddy?: { enabled: boolean } })?.taddy?.enabled ? "✓ Configurado" : "-"}</li>
              <li>World News API: {(settings?.integrations as { worldNews?: { enabled: boolean } })?.worldNews?.enabled ? "✓ Configurado" : "-"}</li>
            </ul>
          </div>
          <div className="card md:col-span-2">
            <h3 className="mb-4 font-semibold">Planes de suscripción</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {((settings?.subscriptionPlans as { id: string; name: string; price: number }[]) ?? []).map((plan) => (
                <div key={plan.id} className="rounded-lg bg-secondary p-3">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.price}€/mes</p>
                </div>
              ))}
            </div>
          </div>
        </div>
    </>
  );
}
