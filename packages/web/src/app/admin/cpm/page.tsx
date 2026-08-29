"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge, PageHeader, StatCard } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { CpmSettlement } from "@/lib/types";
import { formatCurrency, formatNumber, STATUS_COLORS } from "@/lib/utils";

export default function AdminCpmPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [settlements, setSettlements] = useState<CpmSettlement[]>([]);
  const [period, setPeriod] = useState("2026-09");

  const load = () => {
    const token = getToken();
    if (token) api.cpm.settlements(token).then(setSettlements).catch(console.error);
  };

  useEffect(load, [getToken]);

  const calculate = async () => {
    try {
      await api.cpm.calculate(period, getToken()!);
      toast.success("Liquidaciones calculadas");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const approve = async (id: string) => {
    try {
      await api.cpm.approve(id, getToken()!);
      toast.success("Liquidación aprobada");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const totalPending = settlements.filter((s) => s.status === "pending").reduce((a, s) => a + Number(s.amount), 0);

  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminLayout>
        <PageHeader title="Sistema CPM" description="Métricas de impresiones y liquidación a editoriales">
          <div className="flex gap-2">
            <input className="input max-w-[140px]" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <button onClick={calculate} className="btn-primary">Calcular periodo</button>
          </div>
        </PageHeader>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Liquidaciones" value={settlements.length} />
          <StatCard label="Pendientes" value={settlements.filter((s) => s.status === "pending").length} />
          <StatCard label="Importe pendiente" value={formatCurrency(totalPending)} />
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left">Editorial</th><th className="p-3 text-left">Periodo</th>
              <th className="p-3 text-left">Impresiones</th><th className="p-3 text-left">CPM</th>
              <th className="p-3 text-left">Importe</th><th className="p-3 text-left">Estado</th><th className="p-3 text-left">Acción</th>
            </tr></thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="p-3">{s.editorials?.name ?? s.editorial_id.slice(0, 8)}</td>
                  <td className="p-3">{s.period}</td>
                  <td className="p-3">{formatNumber(s.impressions)}</td>
                  <td className="p-3">{s.cpm_rate}€</td>
                  <td className="p-3">{formatCurrency(s.amount)}</td>
                  <td className="p-3"><Badge className={STATUS_COLORS[s.status]}>{s.status}</Badge></td>
                  <td className="p-3">
                    {s.status === "pending" && (
                      <button className="btn-ghost text-xs" onClick={() => approve(s.id)}>Aprobar pago</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
