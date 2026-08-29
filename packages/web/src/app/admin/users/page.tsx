"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Profile } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/utils";

export default function AdminUsersPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [users, setUsers] = useState<Profile[]>([]);

  const load = () => {
    const token = getToken();
    if (token) api.users.list(token).then(setUsers).catch(console.error);
  };

  useEffect(load, [getToken]);

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  };

  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminLayout>
        <PageHeader title="Usuarios" description="Gestión de cuentas de usuario" />
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rol</th><th className="p-3 text-left">Estado</th><th className="p-3 text-left">Acciones</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border">
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3"><Badge>{u.role}</Badge></td>
                  <td className="p-3"><Badge className={STATUS_COLORS[u.status]}>{u.status}</Badge></td>
                  <td className="p-3 space-x-2">
                    {u.status === "active" ? (
                      <button className="btn-ghost text-xs" onClick={() => action(() => api.users.suspend(u.id, getToken()!), "Suspendido")}>Suspender</button>
                    ) : (
                      <button className="btn-ghost text-xs" onClick={() => action(() => api.users.activate(u.id, getToken()!), "Activado")}>Activar</button>
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
