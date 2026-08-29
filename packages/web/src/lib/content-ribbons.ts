export type ContentRibbonKind = "new" | "free" | "owned" | "offline" | "popular";

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

  return ribbons.slice(0, 2);
}

export const RIBBON_META: Record<
  ContentRibbonKind,
  { label: string; shortLabel: string; src: string; alt: string }
> = {
  new: {
    label: "Nuevo",
    shortLabel: "Nuevo",
    src: "/ribbons/ribbon-new.svg",
    alt: "Nuevo",
  },
  free: {
    label: "Gratis",
    shortLabel: "Gratis",
    src: "/ribbons/ribbon-free.svg",
    alt: "Gratis",
  },
  owned: {
    label: "En biblioteca",
    shortLabel: "Tuyo",
    src: "/ribbons/ribbon-owned.svg",
    alt: "En tu biblioteca",
  },
  offline: {
    label: "Offline",
    shortLabel: "Offline",
    src: "/ribbons/ribbon-offline.svg",
    alt: "Disponible offline",
  },
  popular: {
    label: "Popular",
    shortLabel: "Top",
    src: "/ribbons/ribbon-popular.svg",
    alt: "Contenido popular",
  },
};
