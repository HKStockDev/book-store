"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ContentCard, PageHeader } from "@/components/shared/PageHeader";
import { ContentListRow } from "@/components/shared/ContentListRow";
import { ViewModeToggle, type ViewMode } from "@/components/shared/ViewModeToggle";
import { api } from "@/lib/api";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS } from "@/lib/utils";

export default function BrowsePage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    api.catalog.browse({ search: search || undefined, type: type || undefined })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, type]);

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Explorar contenido" description="Descubre libros, cómics, podcasts y más">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </PageHeader>
        <div className="mb-6 flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input max-w-xs" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Cargando catálogo...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No se encontró contenido.</p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} href={`/content/${item.id}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ContentListRow
                key={item.id}
                href={`/content/${item.id}`}
                title={item.title}
                type={item.type}
                coverUrl={item.cover_url}
                author={item.author}
                subtitle={item.editorials?.name}
                price={item.price}
              />
            ))}
          </div>
        )}
      </UserLayout>
    </ProtectedRoute>
  );
}
