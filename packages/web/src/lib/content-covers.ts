/** Curated cover URLs: Open Library for books, Unsplash for other media types. */

const BOOK_COVERS: [string, string][] = [
  ["quijote", "https://covers.openlibrary.org/b/isbn/9788420412146-L.jpg"],
  ["historia de espa", "https://images.unsplash.com/photo-1456513087680-9aaa5b645147?w=600&q=80&auto=format&fit=crop"],
  ["mortadelo", "https://images.unsplash.com/photo-1612036782185-39b4a8d2d2a2?w=600&q=80&auto=format&fit=crop"],
  ["noticias", "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80&auto=format&fit=crop"],
  ["crónica de la ciencia", "https://images.unsplash.com/photo-1478737276239-2f02a577ef88?w=600&q=80&auto=format&fit=crop"],
  ["cien años", "https://covers.openlibrary.org/b/isbn/9788497592208-L.jpg"],
  ["asterix", "https://images.unsplash.com/photo-1612178537253-bccd4370593f?w=600&q=80&auto=format&fit=crop"],
  ["sombra del viento", "https://covers.openlibrary.org/b/isbn/9788408043646-L.jpg"],
  ["1984", "https://covers.openlibrary.org/b/isbn/9788499890944-L.jpg"],
  ["dune", "https://covers.openlibrary.org/b/isbn/9788497596816-L.jpg"],
  ["rayuela", "https://covers.openlibrary.org/b/isbn/9788437617294-L.jpg"],
  ["nombre de la rosa", "https://covers.openlibrary.org/b/isbn/9788432224778-L.jpg"],
  ["aleph", "https://covers.openlibrary.org/b/isbn/9788499080955-L.jpg"],
  ["pilares de la tierra", "https://covers.openlibrary.org/b/isbn/9788497593792-L.jpg"],
  ["orgullo y prejuicio", "https://covers.openlibrary.org/b/isbn/9788491050770-L.jpg"],
  ["casa de los espíritus", "https://covers.openlibrary.org/b/isbn/9788401354135-L.jpg"],
  ["principito", "https://covers.openlibrary.org/b/isbn/9788498381491-L.jpg"],
];

const TYPE_FALLBACKS: Record<string, string[]> = {
  book: [
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512820790801-4159cc8fce0b?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495446815901-a72963e844e8?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524995997941-a1c2e315a42f?w=600&q=80&auto=format&fit=crop",
  ],
  comic: [
    "https://images.unsplash.com/photo-1612036782185-39b4a8d2d2a2?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1612178537253-bccd4370593f?w=600&q=80&auto=format&fit=crop",
  ],
  podcast: [
    "https://images.unsplash.com/photo-1478737276239-2f02a577ef88?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590602847861-f357a7672b24?w=600&q=80&auto=format&fit=crop",
  ],
  news: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80&auto=format&fit=crop",
  ],
  document: [
    "https://images.unsplash.com/photo-1456513087680-9aaa5b645147?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80&auto=format&fit=crop",
  ],
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function findTitleCover(title: string) {
  const normalized = title.toLowerCase();
  for (const [key, url] of BOOK_COVERS) {
    if (normalized.includes(key)) return url;
  }
  return null;
}

function enhanceUnsplashUrl(url: string) {
  if (!url.includes("images.unsplash.com")) return url;
  const parsed = new URL(url);
  if (!parsed.searchParams.has("w")) parsed.searchParams.set("w", "600");
  if (!parsed.searchParams.has("q")) parsed.searchParams.set("q", "80");
  if (!parsed.searchParams.has("auto")) parsed.searchParams.set("auto", "format");
  if (!parsed.searchParams.has("fit")) parsed.searchParams.set("fit", "crop");
  return parsed.toString();
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
  const titleCover = findTitleCover(title);
  if (titleCover) return titleCover;
  if (coverUrl?.trim()) return enhanceUnsplashUrl(coverUrl.trim());
  return getTypeFallback(type, title);
}
