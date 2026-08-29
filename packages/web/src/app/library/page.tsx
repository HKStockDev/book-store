"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ContentCover } from "@/components/shared/ContentCover";
import { ContentListRow } from "@/components/shared/ContentListRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewModeToggle, type ViewMode } from "@/components/shared/ViewModeToggle";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { LibraryItem } from "@/lib/types";

export default function LibraryPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    const token = getToken();
    if (token) api.library.list(token).then(setItems).catch(console.error);
  }, [getToken]);

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Mi biblioteca" description="Contenido adquirido y lectura offline">
          {items.length > 0 && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
        </PageHeader>
        {items.length === 0 ? (
          <p className="text-muted-foreground">Tu biblioteca está vacía. Explora el catálogo para empezar.</p>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.content_items.id}`}
                className="group card overflow-hidden p-0 transition-shadow hover:shadow-md"
              >
                <ContentCover
                  coverUrl={item.content_items.cover_url}
                  title={item.content_items.title}
                  type={item.content_items.type}
                />
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-primary">{item.content_items.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.content_items.editorials?.name}</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.progress.toFixed(0)}% completado</p>
                  {item.offline_available && (
                    <span className="badge mt-2 bg-green-100 text-green-800">
                      <Download className="mr-1 inline h-3 w-3" /> Offline
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ContentListRow
                key={item.id}
                href={`/content/${item.content_items.id}`}
                title={item.content_items.title}
                type={item.content_items.type}
                coverUrl={item.content_items.cover_url}
                subtitle={item.content_items.editorials?.name}
                trailing={
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="h-2 w-24 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.progress.toFixed(0)}%</p>
                    {item.offline_available && (
                      <span className="badge bg-green-100 text-green-800">
                        <Download className="mr-1 h-3 w-3" /> Offline
                      </span>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </UserLayout>
    </ProtectedRoute>
  );
}
