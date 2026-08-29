"use client";

import { useEffect, useState } from "react";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Promotion } from "@/lib/types";
import { formatCurrency, formatNumber, STATUS_COLORS } from "@/lib/utils";

export default function AdminPromotionsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) api.promotions.list(token).then(setPromotions).catch(console.error);
  }, [getToken]);

  return (
    <>
        <PageHeader title="Promociones" description="Campañas promocionales de editoriales" />
        <div className="grid gap-4">
          {promotions.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.editorials?.name}</p>
                </div>
                <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div><span className="text-muted-foreground">Presupuesto</span><p className="font-medium">{formatCurrency(p.budget)}</p></div>
                <div><span className="text-muted-foreground">Gastado</span><p className="font-medium">{formatCurrency(p.spent)}</p></div>
                <div><span className="text-muted-foreground">Impresiones</span><p className="font-medium">{formatNumber(p.impressions)}</p></div>
                <div><span className="text-muted-foreground">Conversiones</span><p className="font-medium">{p.conversions}</p></div>
              </div>
            </div>
          ))}
        </div>
    </>
  );
}
