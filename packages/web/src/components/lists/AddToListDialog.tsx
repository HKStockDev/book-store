"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { ContentCover } from "@/components/shared/ContentCover";
import { api } from "@/lib/api";
import { getContentRibbons } from "@/lib/content-ribbons";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS } from "@/lib/utils";

export function AddToListDialog({
  listName,
  existingIds,
  open,
  onClose,
  onAdd,
}: {
  listName: string;
  existingIds: Set<string>;
  open: boolean;
  onClose: () => void;
  onAdd: (contentId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.catalog.browse({ search: search || undefined })
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, search]);

  if (!open) return null;

  const handleAdd = async (contentId: string) => {
    setAddingId(contentId);
    try {
      await onAdd(contentId);
      toast.success("Añadido a la lista");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al añadir");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card flex max-h-[85vh] w-full max-w-lg flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-semibold">Añadir a &quot;{listName}&quot;</h3>
            <p className="text-sm text-muted-foreground">Busca en el catálogo y añade contenido</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-2" title="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input w-full pl-9"
            placeholder="Buscar por título o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No se encontró contenido</p>
          ) : (
            <ul className="space-y-2">
              {results.map((item) => {
                const inList = existingIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-2"
                  >
                    <ContentCover
                      coverUrl={item.cover_url}
                      title={item.title}
                      type={item.type}
                      className="w-10 rounded"
                      aspectClass="aspect-[3/4]"
                      ribbons={getContentRibbons(item, { contentId: item.id })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.author ?? CONTENT_TYPE_LABELS[item.type] ?? item.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={inList || addingId === item.id}
                      onClick={() => handleAdd(item.id)}
                      className="btn-primary flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs"
                    >
                      {inList ? "En lista" : addingId === item.id ? "Añadiendo..." : (
                        <>
                          <Plus className="h-3 w-3" />
                          Añadir
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
