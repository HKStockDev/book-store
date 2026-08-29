"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ContentCover } from "@/components/shared/ContentCover";
import { ContentListRow } from "@/components/shared/ContentListRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewModeToggle, type ViewMode } from "@/components/shared/ViewModeToggle";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserList } from "@/lib/types";
import { CONTENT_TYPE_LABELS } from "@/lib/utils";

export default function ListsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [lists, setLists] = useState<UserList[]>([]);
  const [newName, setNewName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const load = () => {
    const token = getToken();
    if (token) api.lists.all(token).then(setLists).catch(console.error);
  };

  useEffect(load, [getToken]);

  const createList = async () => {
    const token = getToken();
    if (!token || !newName.trim()) return;
    try {
      await api.lists.create(newName.trim(), token);
      setNewName("");
      load();
      toast.success("Lista creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Mis listas" description="Organiza tu contenido favorito">
          {lists.some((l) => (l.list_items?.length ?? 0) > 0) && (
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          )}
        </PageHeader>
        <div className="mb-6 flex gap-2">
          <input className="input max-w-xs" placeholder="Nueva lista..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button onClick={createList} className="btn-primary"><Plus className="h-4 w-4" /> Crear</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="card">
              <h3 className="font-semibold">{list.name}</h3>
              <p className="text-sm text-muted-foreground">
                {list.is_public ? "Pública" : "Privada"} · {list.list_items?.length ?? 0} elementos
              </p>
              {!list.list_items?.length ? (
                <p className="mt-3 text-sm text-muted-foreground">Lista vacía</p>
              ) : viewMode === "grid" ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {list.list_items.map((li) => (
                    <Link
                      key={li.content_id}
                      href={`/content/${li.content_id}`}
                      className="group overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
                    >
                      <ContentCover
                        coverUrl={li.content_items?.cover_url}
                        title={li.content_items?.title ?? ""}
                        type={li.content_items?.type}
                      />
                      <div className="p-2">
                        <p className="truncate text-xs font-medium group-hover:text-primary">
                          {li.content_items?.title}
                        </p>
                        {li.content_items?.type && (
                          <p className="text-[10px] text-muted-foreground">
                            {CONTENT_TYPE_LABELS[li.content_items.type] ?? li.content_items.type}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.list_items.map((li) => (
                    <li key={li.content_id}>
                      <ContentListRow
                        href={`/content/${li.content_id}`}
                        title={li.content_items?.title ?? ""}
                        type={li.content_items?.type}
                        coverUrl={li.content_items?.cover_url}
                        className="p-3"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
