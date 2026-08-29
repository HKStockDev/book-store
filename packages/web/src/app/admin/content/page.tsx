"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ContentCover } from "@/components/shared/ContentCover";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS, STATUS_COLORS } from "@/lib/utils";

export default function AdminContentPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ cover_url: "", author: "" });

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

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditForm({ cover_url: item.cover_url ?? "", author: item.author ?? "" });
  };

  const saveCover = async (id: string) => {
    try {
      await api.content.update(id, {
        cover_url: editForm.cover_url.trim() || undefined,
        author: editForm.author.trim() || undefined,
      }, getToken()!);
      toast.success("Portada actualizada");
      setEditingId(null);
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
              <th className="p-3 text-left">Portada</th>
              <th className="p-3 text-left">Título</th><th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Editorial</th><th className="p-3 text-left">Estado</th><th className="p-3 text-left">Acciones</th>
            </tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border align-top">
                  <td className="p-3">
                    <ContentCover coverUrl={item.cover_url} title={item.title} type={item.type} className="w-12 rounded-md" />
                  </td>
                  <td className="p-3">
                    <div>{item.title}</div>
                    {item.author && <div className="text-xs text-muted-foreground">{item.author}</div>}
                    {editingId === item.id && (
                      <div className="mt-2 space-y-1">
                        <input
                          className="input text-xs"
                          placeholder="URL de portada"
                          value={editForm.cover_url}
                          onChange={(e) => setEditForm({ ...editForm, cover_url: e.target.value })}
                        />
                        <input
                          className="input text-xs"
                          placeholder="Autor"
                          value={editForm.author}
                          onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                        />
                        <div className="flex gap-1">
                          <button className="btn-primary text-xs" onClick={() => saveCover(item.id)}>Guardar</button>
                          <button className="btn-ghost text-xs" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3">{CONTENT_TYPE_LABELS[item.type] ?? item.type}</td>
                  <td className="p-3">{item.editorials?.name}</td>
                  <td className="p-3"><Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge></td>
                  <td className="p-3 space-x-1">
                    <button className="btn-ghost text-xs" onClick={() => startEdit(item)}>
                      <Pencil className="h-3 w-3 inline" /> Portada
                    </button>
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
