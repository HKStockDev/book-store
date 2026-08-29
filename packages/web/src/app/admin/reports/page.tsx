"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function AdminReportsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) api.reports.summary(token).then((r) => setReport(r as Record<string, unknown>)).catch(console.error);
  }, [getToken]);

  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminLayout>
        <PageHeader title="Informes" description="Reporting y analytics de la plataforma" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Usuarios activos" value={formatNumber(Number(report?.activeUsers ?? 0))} />
          <StatCard label="Ingresos totales" value={formatCurrency(Number(report?.totalRevenue ?? 0))} />
          <StatCard label="Contenido publicado" value={formatNumber(Number(report?.publishedContent ?? 0))} />
          <StatCard label="Impresiones totales" value={formatNumber(Number(report?.totalImpressions ?? 0))} />
        </div>
        {(report?.contentByType as Record<string, number> | undefined) && (
          <div className="card mt-6">
            <h3 className="mb-4 font-semibold">Contenido por tipo</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries((report as Record<string, unknown>).contentByType as Record<string, number>).map(([type, count]) => (
                <div key={type} className="rounded-lg bg-secondary p-3">
                  <p className="text-sm text-muted-foreground capitalize">{type}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
