"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Editorial } from "@/lib/types";
import { STATUS_COLORS, formatCurrency } from "@/lib/utils";

export default function AdminEditorialsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [editorials, setEditorials] = useState<Editorial[]>([]);

  const load = () => {
    const token = getToken();
    if (token) api.editorials.list(token).then(setEditorials).catch(console.error);
  };

  useEffect(load, [getToken]);

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  };

  return (
    <>
        <PageHeader title="Editoriales" description="Gestión de editoriales y publishers" />
        <div className="grid gap-4">
          {editorials.map((ed) => (
            <div key={ed.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{ed.name}</h3>
                <p className="text-sm text-muted-foreground">{ed.contact_email}</p>
                <div className="mt-2 flex gap-2">
                  <Badge className={STATUS_COLORS[ed.status]}>{ed.status}</Badge>
                  <Badge>CPM: {ed.cpm_rate}€</Badge>
                  <Badge>{ed.content_count} contenidos</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {ed.status === "pending" && (
                  <button className="btn-primary text-xs" onClick={() => action(() => api.editorials.approve(ed.id, getToken()!), "Aprobada")}>Aprobar</button>
                )}
                {ed.status === "active" && (
                  <button className="btn-ghost text-xs text-destructive" onClick={() => action(() => api.editorials.suspend(ed.id, getToken()!), "Suspendida")}>Suspender</button>
                )}
              </div>
              <p className="w-full text-sm text-muted-foreground">Ingresos: {formatCurrency(Number(ed.total_revenue))}</p>
            </div>
          ))}
        </div>
    </>
  );
}
