"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS, STATUS_COLORS } from "@/lib/utils";

export default function AdminContentPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<ContentItem[]>([]);

  const load = () => {
    const token = getToken();
    if (token) api.content.list(token).then(setItems).catch(console.error);
  };

  useEffect(load, [getToken]);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.content.updateStatus(id, status, getToken()!);
      toast.success("Estado actualizado");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminLayout>
        <PageHeader title="Contenido" description="Gestión de publicaciones" />
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left">Título</th><th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Editorial</th><th className="p-3 text-left">Estado</th><th className="p-3 text-left">Acciones</th>
            </tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="p-3">{item.title}</td>
                  <td className="p-3">{CONTENT_TYPE_LABELS[item.type] ?? item.type}</td>
                  <td className="p-3">{item.editorials?.name}</td>
                  <td className="p-3"><Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge></td>
                  <td className="p-3 space-x-1">
                    {item.status !== "published" && (
                      <button className="btn-ghost text-xs" onClick={() => setStatus(item.id, "published")}>Publicar</button>
                    )}
                    {item.status !== "archived" && (
                      <button className="btn-ghost text-xs" onClick={() => setStatus(item.id, "archived")}>Archivar</button>
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
