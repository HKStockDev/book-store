"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublisherLayout } from "@/components/layout/PublisherLayout";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PublisherDashboardPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) api.dashboard.stats(token).then(setStats).catch(console.error);
  }, [getToken]);

  return (
    <ProtectedRoute roles={["publisher"]}>
      <PublisherLayout>
        <PageHeader title="Dashboard editorial" description="Resumen de tu editorial" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Contenidos" value={stats?.editorialContent ?? 0} />
          <StatCard label="Impresiones" value={formatNumber(stats?.editorialImpressions ?? 0)} />
          <StatCard label="Ingresos" value={formatCurrency(stats?.editorialRevenue ?? 0)} />
        </div>
      </PublisherLayout>
    </ProtectedRoute>
  );
}
