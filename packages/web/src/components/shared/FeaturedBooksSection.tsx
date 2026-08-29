"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { ContentCard } from "@/components/shared/PageHeader";
import { ContentRibbonStrip } from "@/components/shared/ContentRibbon";
import { api } from "@/lib/api";
import type { ContentRibbonKind } from "@/lib/content-ribbons";
import { getDisplayRibbons, RIBBON_META } from "@/lib/content-ribbons";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function FeaturedRow({
  title,
  description,
  icon,
  items,
  primaryRibbon,
  ownedIds,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ContentItem[];
  primaryRibbon: ContentRibbonKind;
  ownedIds?: Set<string>;
}) {
  const ribbonMeta = RIBBON_META[primaryRibbon];

  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ribbonMeta.src} alt="" className="h-3.5 w-3.5" aria-hidden />
                {ribbonMeta.shortLabel}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {items.map((item) => (
          <div key={item.id} className="w-36 shrink-0 sm:w-40">
            <ContentCard
              item={item}
              href={`/content/${item.id}`}
              ownedIds={ownedIds}
              primaryRibbon={primaryRibbon}
            />
            <div className="mt-2 px-1">
              <p className="line-clamp-2 text-xs font-medium leading-snug">{item.title}</p>
              {item.author && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.author}</p>
              )}
              <ContentRibbonStrip
                kinds={getDisplayRibbons(item, { contentId: item.id, ownedIds }, primaryRibbon)}
                className="mt-1.5"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturedBooksSection({
  ownedIds,
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
          ownedIds={ownedIds}
        />
      )}
      {featured.recommended.length > 0 && (
        <FeaturedRow
          title="Recomendados para ti"
          description="Selección destacada según popularidad"
          icon={<TrendingUp className="h-5 w-5" />}
          items={featured.recommended}
          primaryRibbon="recommended"
          ownedIds={ownedIds}
        />
      )}
    </section>
  );
}
