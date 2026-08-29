"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ContentCover } from "@/components/shared/ContentCover";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserList } from "@/lib/types";

export default function ListsPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [lists, setLists] = useState<UserList[]>([]);
  const [newName, setNewName] = useState("");

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
        <PageHeader title="Mis listas" description="Organiza tu contenido favorito" />
        <div className="mb-6 flex gap-2">
          <input className="input max-w-xs" placeholder="Nueva lista..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button onClick={createList} className="btn-primary"><Plus className="h-4 w-4" /> Crear</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="card">
              <h3 className="font-semibold">{list.name}</h3>
              <p className="text-sm text-muted-foreground">{list.is_public ? "Pública" : "Privada"} · {list.list_items?.length ?? 0} elementos</p>
              <ul className="mt-3 space-y-1">
                {list.list_items?.map((li) => (
                  <li key={li.content_id} className="flex items-center gap-2 text-sm">
                    <ContentCover
                      coverUrl={li.content_items?.cover_url}
                      title={li.content_items?.title ?? ""}
                      className="w-8 rounded"
                      aspectClass="aspect-[3/4]"
                    />
                    <span>{li.content_items?.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
