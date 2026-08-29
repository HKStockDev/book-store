"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ContentCard, PageHeader } from "@/components/shared/PageHeader";
import { ContentListRow } from "@/components/shared/ContentListRow";
import { FeaturedBooksSection } from "@/components/shared/FeaturedBooksSection";
import { ViewModeToggle, type ViewMode } from "@/components/shared/ViewModeToggle";
import { api } from "@/lib/api";
import { getContentRibbons } from "@/lib/content-ribbons";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { cn, CONTENT_TYPE_LABELS } from "@/lib/utils";

export default function BrowsePage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    api.catalog.categories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.library.list(token)
      .then((library) => setOwnedIds(new Set(library.map((entry) => entry.content_items.id))))
      .catch(console.error);
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    api.catalog.browse({
      search: search || undefined,
      type: type || undefined,
      genre: genre || undefined,
    })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, type, genre]);

  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);
  const filtersActive = Boolean(search || type || genre);

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader
          title="Explorar contenido"
          description={`Descubre libros, cómics, podcasts y más${totalCount ? ` · ${totalCount} títulos disponibles` : ""}`}
        >
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </PageHeader>

        <FeaturedBooksSection ownedIds={ownedIds} hidden={filtersActive} />

        {categories.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Categorías</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGenre("")}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  !genre ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
                )}
              >
                Todas ({totalCount})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setGenre(cat.name)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    genre === cat.name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="Buscar por título o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <>
            <p className="mb-4 text-sm text-muted-foreground">{items.length} resultados</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} href={`/content/${item.id}`} ownedIds={ownedIds} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{items.length} resultados</p>
            <div className="space-y-3">
              {items.map((item) => (
                <ContentListRow
                  key={item.id}
                  href={`/content/${item.id}`}
                  title={item.title}
                  type={item.type}
                  coverUrl={item.cover_url}
                  author={item.author}
                  subtitle={item.genre ?? item.editorials?.name}
                  price={item.price}
                  ribbons={getContentRibbons(item, { contentId: item.id, ownedIds })}
                />
              ))}
            </div>
          </>
        )}
      </UserLayout>
    </ProtectedRoute>
  );
}
