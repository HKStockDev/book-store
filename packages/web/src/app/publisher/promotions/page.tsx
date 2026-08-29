"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublisherLayout } from "@/components/layout/PublisherLayout";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Promotion } from "@/lib/types";
import { formatCurrency, formatNumber, STATUS_COLORS } from "@/lib/utils";

export default function PublisherPromotionsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) api.promotions.list(token).then(setPromotions).catch(console.error);
  }, [getToken]);

  return (
    <ProtectedRoute roles={["publisher"]}>
      <PublisherLayout>
        <PageHeader title="Promociones" description="Herramienta de promoción e informes" />
        <div className="grid gap-4">
          {promotions.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{p.start_date} — {p.end_date}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div><span className="text-muted-foreground">Presupuesto</span><p>{formatCurrency(p.budget)}</p></div>
                <div><span className="text-muted-foreground">Gastado</span><p>{formatCurrency(p.spent)}</p></div>
                <div><span className="text-muted-foreground">Clics</span><p>{formatNumber(p.clicks)}</p></div>
                <div><span className="text-muted-foreground">Conversiones</span><p>{p.conversions}</p></div>
              </div>
            </div>
          ))}
        </div>
      </PublisherLayout>
    </ProtectedRoute>
  );
}
