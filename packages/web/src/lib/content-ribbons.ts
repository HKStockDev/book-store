export type ContentRibbonKind = "new" | "free" | "owned" | "offline" | "popular" | "recommended";

export interface RibbonSource {
  price?: number | null;
  published_at?: string | null;
  purchases?: number;
}

export interface RibbonContext {
  ownedIds?: Set<string>;
  contentId?: string;
  offline?: boolean;
  /** Skip ribbons already implied by page context */
  skipOwned?: boolean;
}

const NEW_DAYS = 30;
const POPULAR_PURCHASES = 50;

export function isNewContent(publishedAt?: string | null, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return false;
  return now - published <= NEW_DAYS * 24 * 60 * 60 * 1000;
}

export function isFreeContent(price?: number | null): boolean {
  return price == null || price <= 0;
}

export function isPopularContent(purchases?: number): boolean {
  return (purchases ?? 0) >= POPULAR_PURCHASES;
}

export function getContentRibbons(
  item: RibbonSource,
  context: RibbonContext = {},
): ContentRibbonKind[] {
  const ribbons: ContentRibbonKind[] = [];

  if (context.offline) ribbons.push("offline");

  if (
    context.contentId &&
    context.ownedIds?.has(context.contentId) &&
    !context.skipOwned
  ) {
    ribbons.push("owned");
  }

  if (isNewContent(item.published_at)) ribbons.push("new");
  if (isFreeContent(item.price)) ribbons.push("free");
  if (isPopularContent(item.purchases)) ribbons.push("popular");

  return ribbons.slice(0, 1);
}

export function getDisplayRibbons(
  item: RibbonSource,
  context: RibbonContext = {},
  primaryRibbon?: ContentRibbonKind,
): ContentRibbonKind[] {
  if (primaryRibbon) return [primaryRibbon];
  return getContentRibbons(item, context);
}

export interface FeaturedCatalogItem extends RibbonSource {
  id: string;
  title: string;
  type: string;
  genre?: string | null;
  cover_url?: string;
  author?: string;
  impressions?: number;
}

const FEATURED_NEW_LIMIT = 8;
const FEATURED_RECOMMENDED_LIMIT = 8;

export function selectNewBooks<T extends FeaturedCatalogItem>(items: T[], limit = FEATURED_NEW_LIMIT): T[] {
  const sorted = [...items].sort((a, b) => {
    const aTime = a.published_at ? new Date(a.published_at).getTime() : 0;
    const bTime = b.published_at ? new Date(b.published_at).getTime() : 0;
    return bTime - aTime;
  });

  const recent = sorted.filter((item) => isNewContent(item.published_at));
  if (recent.length >= Math.min(4, limit)) return recent.slice(0, limit);
  return sorted.slice(0, limit);
}

export function selectRecommendedBooks<T extends FeaturedCatalogItem>(
  items: T[],
  excludeIds: Set<string> = new Set(),
  limit = FEATURED_RECOMMENDED_LIMIT,
): T[] {
  return [...items]
    .filter((item) => !excludeIds.has(item.id))
    .sort((a, b) => {
      const purchaseDiff = (b.purchases ?? 0) - (a.purchases ?? 0);
      if (purchaseDiff !== 0) return purchaseDiff;
      return (b.impressions ?? 0) - (a.impressions ?? 0);
    })
    .slice(0, limit);
}

export const RIBBON_META: Record<
  ContentRibbonKind,
  { label: string; shortLabel: string; ribbonText: string; color: string; alt: string }
> = {
  new: {
    label: "Nuevo",
    shortLabel: "Nuevo",
    ribbonText: "NUEVO",
    color: "#B91C1C",
    alt: "Nuevo",
  },
  free: {
    label: "Gratis",
    shortLabel: "Gratis",
    ribbonText: "GRATIS",
    color: "#15803D",
    alt: "Gratis",
  },
  owned: {
    label: "En biblioteca",
    shortLabel: "Tuyo",
    ribbonText: "TUYO",
    color: "#6B4C2A",
    alt: "En tu biblioteca",
  },
  offline: {
    label: "Offline",
    shortLabel: "Offline",
    ribbonText: "OFFLINE",
    color: "#1D4ED8",
    alt: "Disponible offline",
  },
  popular: {
    label: "Popular",
    shortLabel: "Top",
    ribbonText: "TOP",
    color: "#C2410C",
    alt: "Contenido popular",
  },
  recommended: {
    label: "Recomendado",
    shortLabel: "Recom.",
    ribbonText: "RECOM.",
    color: "#7C3AED",
    alt: "Contenido recomendado",
  },
};
