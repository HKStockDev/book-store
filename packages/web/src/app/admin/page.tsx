"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) api.dashboard.stats(token).then(setStats).catch(console.error);
  }, [getToken]);

  return (
    <>
        <PageHeader title="Dashboard" description="Vista general de la plataforma IWWEI" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Usuarios" value={formatNumber(stats?.totalUsers ?? 0)} />
          <StatCard label="Editoriales" value={formatNumber(stats?.totalEditorials ?? 0)} />
          <StatCard label="Contenido" value={formatNumber(stats?.totalContent ?? 0)} />
          <StatCard label="Ingresos totales" value={formatCurrency(stats?.totalRevenue ?? 0)} />
          <StatCard label="Ingresos mensuales" value={formatCurrency(stats?.monthlyRevenue ?? 0)} />
          <StatCard label="Impresiones CPM" value={formatNumber(stats?.totalImpressions ?? 0)} />
          <StatCard label="Liquidaciones pendientes" value={stats?.pendingSettlements ?? 0} />
          <StatCard label="Promociones activas" value={stats?.activePromotions ?? 0} />
        </div>
    </>
  );
}
