"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, Download, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { Badge } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { ContentItem } from "@/lib/types";
import { CONTENT_TYPE_LABELS, formatCurrency } from "@/lib/utils";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const getToken = useAuthStore((s) => s.getToken);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (id) api.catalog.get(id).then(setItem).catch(console.error);
  }, [id]);

  const handlePurchase = async () => {
    const token = getToken();
    if (!token || !id) return;
    try {
      await api.catalog.purchase(id, token);
      toast.success("Compra realizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleReview = async () => {
    const token = getToken();
    if (!token || !id) return;
    try {
      await api.reviews.create({ contentId: id, rating, comment }, token);
      toast.success("Reseña publicada");
      const updated = await api.catalog.get(id);
      setItem(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  if (!item) return <ProtectedRoute roles={["user"]}><UserLayout><p>Cargando...</p></UserLayout></ProtectedRoute>;

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="card overflow-hidden p-0">
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_url} alt={item.title} className="w-full" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-secondary">Sin portada</div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Badge>{CONTENT_TYPE_LABELS[item.type] ?? item.type}</Badge>
              {item.integration && <Badge className="ml-2 bg-primary/10 text-primary">{item.integration}</Badge>}
              <h1 className="mt-2 text-3xl font-bold">{item.title}</h1>
              {item.author && <p className="text-muted-foreground">{item.author}</p>}
              {item.editorials && <p className="text-sm text-muted-foreground">{item.editorials.name}</p>}
            </div>
            <p>{item.description}</p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">{item.price != null ? formatCurrency(item.price) : "Gratis"}</span>
              {item.price != null && (
                <button onClick={handlePurchase} className="btn-primary">
                  <ShoppingCart className="h-4 w-4" /> Comprar
                </button>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 font-semibold">Lector multiformato</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {item.integration === "apryse" && "Visor documental Apryse integrado"}
                {item.integration === "taddy" && "Reproductor Taddy para cómics/podcasts"}
                {item.integration === "worldnews" && "Agregador World News API"}
                {!item.integration && "Lector estándar IWWEI con soporte offline"}
              </p>
              <button className="btn-secondary"><Download className="h-4 w-4" /> Descargar offline</button>
            </div>

            <div className="card">
              <h2 className="mb-4 font-semibold">Reseñas ({item.reviews?.length ?? 0})</h2>
              {item.reviews?.map((r) => (
                <div key={r.id} className="mb-3 border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                    <span className="ml-2 text-sm">{r.profiles?.full_name}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                </div>
              ))}
              <div className="mt-4 space-y-3">
                <select className="input max-w-xs" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}
                </select>
                <textarea className="input" placeholder="Tu reseña..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                <button onClick={handleReview} className="btn-primary">Publicar reseña</button>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
