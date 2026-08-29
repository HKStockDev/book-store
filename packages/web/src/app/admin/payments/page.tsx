"use client";

import { useEffect, useState } from "react";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Payment } from "@/lib/types";
import { formatCurrency, STATUS_COLORS } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) api.payments.list(token).then(setPayments).catch(console.error);
  }, [getToken]);

  return (
    <>
        <PageHeader title="Pagos" description="Historial de transacciones" />
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left">Usuario</th><th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Importe</th><th className="p-3 text-left">Estado</th>
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="p-3">{p.profiles?.full_name ?? p.user_id.slice(0, 8)}</td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3">{formatCurrency(p.amount)}</td>
                  <td className="p-3"><Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </>
  );
}
