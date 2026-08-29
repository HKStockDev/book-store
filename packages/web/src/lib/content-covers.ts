/**
 * Curated cover art served from /public/covers (committed to GitHub).
 * Images sourced from Open Library (books/comics) and Unsplash (news).
 */

export const COVER_ASSETS: Record<string, string> = {
  "quijote": "/covers/quijote.jpg",
  "historia-espana": "/covers/historia-espana.jpg",
  "mortadelo": "/covers/mortadelo.jpg",
  "noticias": "/covers/noticias.jpg",
  "cronica-ciencia": "/covers/cronica-ciencia.jpg",
  "cien-anos": "/covers/cien-anos.jpg",
  "asterix": "/covers/asterix.jpg",
  "sombra-viento": "/covers/sombra-viento.jpg",
  "1984": "/covers/1984.jpg",
  "dune": "/covers/dune.jpg",
  "rayuela": "/covers/rayuela.jpg",
  "nombre-rosa": "/covers/nombre-rosa.jpg",
  "aleph": "/covers/aleph.jpg",
  "pilares": "/covers/pilares.jpg",
  "orgullo": "/covers/orgullo.jpg",
  "casa-espiritus": "/covers/casa-espiritus.jpg",
  "principito": "/covers/principito.jpg",
};

/** Maps normalized title fragments to cover asset keys. */
const TITLE_TO_COVER: [string, keyof typeof COVER_ASSETS][] = [
  ["quijote", "quijote"],
  ["historia de espa", "historia-espana"],
  ["mortadelo", "mortadelo"],
  ["noticias del d", "noticias"],
  ["noticias", "noticias"],
  ["crónica de la ciencia", "cronica-ciencia"],
  ["cronica de la ciencia", "cronica-ciencia"],
  ["cien años", "cien-anos"],
  ["cien anos", "cien-anos"],
  ["asterix", "asterix"],
  ["sombra del viento", "sombra-viento"],
  ["1984", "1984"],
  ["dune", "dune"],
  ["rayuela", "rayuela"],
  ["nombre de la rosa", "nombre-rosa"],
  ["el aleph", "aleph"],
  [" aleph", "aleph"],
  ["pilares de la tierra", "pilares"],
  ["orgullo y prejuicio", "orgullo"],
  ["casa de los espíritus", "casa-espiritus"],
  ["casa de los espiritus", "casa-espiritus"],
  ["principito", "principito"],
];

const TYPE_FALLBACKS: Record<string, string[]> = {
  book: [COVER_ASSETS.quijote, COVER_ASSETS.orgullo, COVER_ASSETS.principito, COVER_ASSETS.dune],
  comic: [COVER_ASSETS.mortadelo, COVER_ASSETS.asterix],
  podcast: [COVER_ASSETS["cronica-ciencia"]],
  news: [COVER_ASSETS.noticias],
  document: [COVER_ASSETS["historia-espana"]],
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function findCoverByTitle(title: string) {
  const normalized = title.toLowerCase();
  for (const [fragment, key] of TITLE_TO_COVER) {
    if (normalized.includes(fragment)) return COVER_ASSETS[key];
  }
  return null;
}

export function getTypeFallback(type?: string, seed = "default") {
  const pool = TYPE_FALLBACKS[type ?? "book"] ?? TYPE_FALLBACKS.book;
  return pool[hashString(seed) % pool.length];
}

export function resolveCoverUrl(
  coverUrl: string | null | undefined,
  title: string,
  type?: string,
) {
  const titleCover = findCoverByTitle(title);
  if (titleCover) return titleCover;

  if (coverUrl?.trim()) {
    const trimmed = coverUrl.trim();
    if (trimmed.startsWith("/covers/")) return trimmed;
    return trimmed;
  }

  return getTypeFallback(type, title);
}

export function getCoverUrlForTitle(title: string) {
  return findCoverByTitle(title) ?? COVER_ASSETS.quijote;
}

/** GitHub raw fallback when local /covers path is unavailable. */
export const GITHUB_COVERS_BASE =
  "https://raw.githubusercontent.com/HKStockDev/book-store/main/packages/web/public/covers";

export function toGithubCoverUrl(localPath: string) {
  if (!localPath.startsWith("/covers/")) return localPath;
  return `${GITHUB_COVERS_BASE}/${localPath.slice("/covers/".length)}`;
}

export function resolveCoverFallback(
  currentSrc: string,
  title: string,
  type?: string,
) {
  if (currentSrc.startsWith("/covers/")) return toGithubCoverUrl(currentSrc);
  const titleCover = findCoverByTitle(title);
  if (titleCover && titleCover !== currentSrc) return toGithubCoverUrl(titleCover);
  return getTypeFallback(type, `${title}-fallback`);
}
