"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { ContentCover } from "@/components/shared/ContentCover";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS, STATUS_COLORS } from "@/lib/utils";

const emptyForm = {
  title: "",
  type: "book",
  price: "",
  integration: "",
  cover_url: "",
  author: "",
  description: "",
};

export default function PublisherContentPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ cover_url: "", author: "", description: "" });

  const load = () => {
    const token = getToken();
    if (token) api.content.list(token).then(setItems).catch(console.error);
  };

  useEffect(load, [getToken]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type === "book" && !form.cover_url.trim()) {
      toast.error("La portada es obligatoria para libros");
      return;
    }
    try {
      await api.content.create({
        title: form.title,
        type: form.type,
        price: form.price ? Number(form.price) : undefined,
        integration: form.integration || undefined,
        cover_url: form.cover_url.trim() || undefined,
        author: form.author.trim() || undefined,
        description: form.description.trim() || undefined,
      }, getToken()!);
      toast.success("Contenido enviado a revisión");
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditForm({
      cover_url: item.cover_url ?? "",
      author: item.author ?? "",
      description: item.description ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.cover_url.trim()) {
      toast.error("La URL de portada es obligatoria");
      return;
    }
    try {
      await api.content.update(id, {
        cover_url: editForm.cover_url.trim(),
        author: editForm.author.trim() || undefined,
        description: editForm.description.trim() || undefined,
      }, getToken()!);
      toast.success("Portada actualizada");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <>
        <PageHeader title="Mis publicaciones" description="Sube y gestiona tu contenido" />
        <form onSubmit={create} className="card mb-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className="input" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" placeholder="Autor" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <input className="input" type="number" step="0.01" placeholder="Precio (€)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <select className="input" value={form.integration} onChange={(e) => setForm({ ...form, integration: e.target.value })}>
              <option value="">Sin integración</option>
              <option value="apryse">Apryse</option>
              <option value="taddy">Taddy</option>
              <option value="worldnews">World News</option>
            </select>
            <input
              className="input"
              placeholder={form.type === "book" ? "URL de portada (obligatoria)" : "URL de portada"}
              value={form.cover_url}
              onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
              required={form.type === "book"}
            />
          </div>
          <textarea
            className="input"
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <div className="flex flex-wrap items-end gap-4">
            {form.cover_url && (
              <ContentCover coverUrl={form.cover_url} title={form.title || "Vista previa"} type={form.type} className="w-24 rounded-md" />
            )}
            <button type="submit" className="btn-primary">Publicar</button>
          </div>
        </form>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-start gap-4">
                <ContentCover coverUrl={item.cover_url} title={item.title} type={item.type} className="w-16 rounded-md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {CONTENT_TYPE_LABELS[item.type]}
                        {item.author ? ` · ${item.author}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" className="btn-ghost text-xs" onClick={() => startEdit(item)}>
                        <Pencil className="h-3 w-3" />
                      </button>
                      <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                    </div>
                  </div>
                  {editingId === item.id && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <input
                        className="input"
                        placeholder="URL de portada"
                        value={editForm.cover_url}
                        onChange={(e) => setEditForm({ ...editForm, cover_url: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="Autor"
                        value={editForm.author}
                        onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      />
                      <textarea
                        className="input"
                        placeholder="Descripción"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="btn-primary text-xs" onClick={() => saveEdit(item.id)}>Guardar</button>
                        <button type="button" className="btn-ghost text-xs" onClick={() => setEditingId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
    </>
  );
}
