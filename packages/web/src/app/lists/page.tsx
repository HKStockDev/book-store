"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe, Lock, Pencil, Plus, Trash2, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { AddToListDialog } from "@/components/lists/AddToListDialog";
import { ContentCover } from "@/components/shared/ContentCover";
import { ContentListRow } from "@/components/shared/ContentListRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewModeToggle, type ViewMode } from "@/components/shared/ViewModeToggle";
import { api } from "@/lib/api";
import { getContentRibbons } from "@/lib/content-ribbons";
import { useAuthStore } from "@/lib/auth-store";
import type { UserList } from "@/lib/types";
import { cn, CONTENT_TYPE_LABELS } from "@/lib/utils";

export default function ListsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [lists, setLists] = useState<UserList[]>([]);
  const [newName, setNewName] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addDialogList, setAddDialogList] = useState<UserList | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());

  const load = () => {
    const token = getToken();
    if (token) {
      api.lists.all(token).then(setLists).catch(console.error);
      api.library.list(token)
        .then((library) => setOwnedIds(new Set(library.map((entry) => entry.content_items.id))))
        .catch(console.error);
    }
  };

  useEffect(load, [getToken]);

  const createList = async () => {
    const token = getToken();
    if (!token || !newName.trim()) return;
    try {
      await api.lists.create(newName.trim(), token, newPublic);
      setNewName("");
      setNewPublic(false);
      load();
      toast.success("Lista creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const deleteList = async (list: UserList) => {
    if (!confirm(`¿Eliminar la lista "${list.name}"?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.lists.delete(list.id, token);
      load();
      toast.success("Lista eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const saveRename = async (listId: string) => {
    const token = getToken();
    if (!token || !editName.trim()) return;
    try {
      await api.lists.update(listId, { name: editName.trim() }, token);
      setEditingId(null);
      load();
      toast.success("Lista actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const togglePublic = async (list: UserList) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.lists.update(list.id, { isPublic: !list.is_public }, token);
      load();
      toast.success(list.is_public ? "Lista ahora es privada" : "Lista ahora es pública");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const removeItem = async (listId: string, contentId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.lists.removeItem(listId, contentId, token);
      load();
      toast.success("Eliminado de la lista");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const addItem = async (listId: string, contentId: string) => {
    const token = getToken();
    if (!token) return;
    await api.lists.addItem(listId, contentId, token);
    load();
    setAddDialogList((prev) => {
      if (!prev || prev.id !== listId) return prev;
      return {
        ...prev,
        list_items: [
          ...(prev.list_items ?? []),
          { content_id: contentId, content_items: { title: "", type: "book" } },
        ],
      };
    });
  };

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Mis listas" description="Organiza tu contenido favorito">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </PageHeader>

        <div className="card mb-6">
          <p className="mb-3 text-sm font-medium">Nueva lista</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input max-w-xs"
              placeholder="Nombre de la lista..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createList()}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
                className="rounded border-border"
              />
              Lista pública
            </label>
            <button type="button" onClick={createList} className="btn-primary">
              <Plus className="h-4 w-4" /> Crear lista
            </button>
          </div>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted-foreground">No tienes listas. Crea una arriba para empezar.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {lists.map((list) => {
              const existingIds = new Set((list.list_items ?? []).map((li) => li.content_id));
              return (
                <div key={list.id} className="card flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingId === list.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="input flex-1 py-1 text-sm"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(list.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={() => saveRename(list.id)} className="btn-primary p-2">
                            <Check className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="btn-ghost p-2">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="truncate font-semibold">{list.name}</h3>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        {list.is_public ? (
                          <><Globe className="h-3.5 w-3.5" /> Pública</>
                        ) : (
                          <><Lock className="h-3.5 w-3.5" /> Privada</>
                        )}
                        · {list.list_items?.length ?? 0} elementos
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingId(list.id); setEditName(list.name); }}
                        className="btn-ghost p-2"
                        title="Renombrar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePublic(list)}
                        className="btn-ghost p-2"
                        title={list.is_public ? "Hacer privada" : "Hacer pública"}
                      >
                        {list.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteList(list)}
                        className="btn-ghost p-2 text-destructive"
                        title="Eliminar lista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddDialogList(list)}
                    className="btn-secondary mt-4 w-full text-sm"
                  >
                    <Plus className="h-4 w-4" /> Añadir contenido
                  </button>

                  {!list.list_items?.length ? (
                    <p className="mt-4 text-center text-sm text-muted-foreground">Lista vacía</p>
                  ) : viewMode === "grid" ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {list.list_items.map((li) => {
                        const content = li.content_items;
                        const ribbons = content
                          ? getContentRibbons(content, { contentId: li.content_id, ownedIds })
                          : [];
                        return (
                        <div key={li.content_id} className="group relative overflow-hidden rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => removeItem(list.id, li.content_id)}
                            className="absolute right-1 top-1 z-20 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
                            title="Quitar de la lista"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                          <Link href={`/content/${li.content_id}`} className="block">
                            <ContentCover
                              coverUrl={content?.cover_url}
                              title={content?.title ?? ""}
                              type={content?.type}
                              ribbons={ribbons}
                            />
                            <div className="p-2">
                              <p className="truncate text-xs font-medium group-hover:text-primary">
                                {content?.title}
                              </p>
                              {content?.type && (
                                <p className="text-[10px] text-muted-foreground">
                                  {CONTENT_TYPE_LABELS[content.type] ?? content.type}
                                </p>
                              )}
                            </div>
                          </Link>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {list.list_items.map((li) => {
                        const content = li.content_items;
                        const ribbons = content
                          ? getContentRibbons(content, { contentId: li.content_id, ownedIds })
                          : [];
                        return (
                        <li key={li.content_id} className="group relative">
                          <ContentListRow
                            href={`/content/${li.content_id}`}
                            title={content?.title ?? ""}
                            type={content?.type}
                            coverUrl={content?.cover_url}
                            ribbons={ribbons}
                            className="p-3 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(list.id, li.content_id)}
                            className={cn(
                              "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2",
                              "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                            )}
                            title="Quitar de la lista"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {addDialogList && (
          <AddToListDialog
            listName={addDialogList.name}
            existingIds={new Set((addDialogList.list_items ?? []).map((li) => li.content_id))}
            open={!!addDialogList}
            onClose={() => { setAddDialogList(null); load(); }}
            onAdd={(contentId) => addItem(addDialogList.id, contentId)}
          />
        )}
      </UserLayout>
    </ProtectedRoute>
  );
}
