"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublisherLayout } from "@/components/layout/PublisherLayout";
import { Badge, PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS, STATUS_COLORS } from "@/lib/utils";

export default function PublisherContentPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState({ title: "", type: "book", price: "", integration: "" });

  const load = () => {
    const token = getToken();
    if (token) api.content.list(token).then(setItems).catch(console.error);
  };

  useEffect(load, [getToken]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.content.create({
        title: form.title,
        type: form.type,
        price: form.price ? Number(form.price) : undefined,
        integration: form.integration || undefined,
      }, getToken()!);
      toast.success("Contenido enviado a revisión");
      setForm({ title: "", type: "book", price: "", integration: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <ProtectedRoute roles={["publisher"]}>
      <PublisherLayout>
        <PageHeader title="Mis publicaciones" description="Sube y gestiona tu contenido" />
        <form onSubmit={create} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="input" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="input" type="number" step="0.01" placeholder="Precio (€)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <select className="input" value={form.integration} onChange={(e) => setForm({ ...form, integration: e.target.value })}>
            <option value="">Sin integración</option>
            <option value="apryse">Apryse</option>
            <option value="taddy">Taddy</option>
            <option value="worldnews">World News</option>
          </select>
          <button type="submit" className="btn-primary">Publicar</button>
        </form>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{CONTENT_TYPE_LABELS[item.type]}</p>
              </div>
              <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
            </div>
          ))}
        </div>
      </PublisherLayout>
    </ProtectedRoute>
  );
}
