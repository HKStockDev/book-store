"use client";

import { useEffect, useState } from "react";
import { Download, BookOpen } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { LibraryItem } from "@/lib/types";

export default function LibraryPage() {
  const getToken = useAuthStore((s) => s.getToken);
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    const token = getToken();
    if (token) api.library.list(token).then(setItems).catch(console.error);
  }, [getToken]);

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Mi biblioteca" description="Contenido adquirido y lectura offline" />
        {items.length === 0 ? (
          <p className="text-muted-foreground">Tu biblioteca está vacía. Explora el catálogo para empezar.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card flex items-center gap-4">
                <BookOpen className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.content_items.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.content_items.editorials?.name}</p>
                  <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.progress.toFixed(0)}% completado</p>
                </div>
                {item.offline_available && (
                  <span className="badge bg-green-100 text-green-800"><Download className="mr-1 h-3 w-3" /> Offline</span>
                )}
              </div>
            ))}
          </div>
        )}
      </UserLayout>
    </ProtectedRoute>
  );
}
