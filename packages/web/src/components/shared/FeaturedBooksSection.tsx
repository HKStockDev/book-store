"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { BookCarousel } from "@/components/shared/BookCarousel";
import { ContentCover } from "@/components/shared/ContentCover";
import { api } from "@/lib/api";
import type { ContentRibbonKind } from "@/lib/content-ribbons";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function FeaturedRow({
  title,
  description,
  icon,
  items,
  primaryRibbon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ContentItem[];
  primaryRibbon: ContentRibbonKind;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <BookCarousel>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/content/${item.id}`}
            className="group w-36 shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:w-40"
            title={item.title}
          >
            <ContentCover
              coverUrl={item.cover_url}
              title={item.title}
              type={item.type}
              ribbons={[primaryRibbon]}
              ribbonSize="md"
              className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>
        ))}
      </BookCarousel>
    </div>
  );
}

export function FeaturedBooksSection({
  hidden = false,
}: {
  ownedIds?: Set<string>;
  hidden?: boolean;
}) {
  const [featured, setFeatured] = useState<{ new: ContentItem[]; recommended: ContentItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.catalog.featured()
      .then(setFeatured)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (hidden) return null;
  if (loading) {
    return (
      <section className="mb-8 rounded-xl border border-dashed border-border bg-card/40 p-6">
        <p className="text-sm text-muted-foreground">Cargando novedades y recomendaciones...</p>
      </section>
    );
  }
  if (!featured || (!featured.new.length && !featured.recommended.length)) return null;

  return (
    <section className={cn("mb-8 space-y-4")}>
      {featured.new.length > 0 && (
        <FeaturedRow
          title="Novedades"
          description="Lo más reciente del catálogo"
          icon={<Sparkles className="h-5 w-5" />}
          items={featured.new}
          primaryRibbon="new"
        />
      )}
      {featured.recommended.length > 0 && (
        <FeaturedRow
          title="Recomendados para ti"
          description="Selección destacada según popularidad"
          icon={<TrendingUp className="h-5 w-5" />}
          items={featured.recommended}
          primaryRibbon="recommended"
        />
      )}
    </section>
  );
}
