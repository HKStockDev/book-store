"use client";

import { useEffect, useState } from "react";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { CpmSettlement } from "@/lib/types";
import { formatCurrency, formatNumber, STATUS_COLORS } from "@/lib/utils";

export default function PublisherCpmPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [settlements, setSettlements] = useState<CpmSettlement[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) api.cpm.settlements(token).then(setSettlements).catch(console.error);
  }, [getToken]);

  return (
    <>
        <PageHeader title="Liquidaciones CPM" description="Informes de impresiones y pagos" />
        <div className="space-y-4">
          {settlements.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Periodo {s.period}</p>
                <p className="text-sm text-muted-foreground">{formatNumber(s.impressions)} impresiones · CPM {s.cpm_rate}€</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold">{formatCurrency(s.amount)}</span>
                <Badge className={STATUS_COLORS[s.status]}>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
    </>
  );
}
