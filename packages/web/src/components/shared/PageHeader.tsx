import { cn } from "@/lib/utils";
import { getContentRibbons } from "@/lib/content-ribbons";
import { ContentCover } from "./ContentCover";

export function PageHeader({ title, description, children }: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("badge bg-secondary text-secondary-foreground", className)}>{children}</span>;
}

export function ContentCard({
  item,
  href,
  ownedIds,
}: {
  item: {
    id: string;
    title: string;
    type: string;
    genre?: string | null;
    price?: number | null;
    cover_url?: string;
    author?: string;
    published_at?: string | null;
    purchases?: number;
  };
  href: string;
  ownedIds?: Set<string>;
}) {
  const label = item.genre ?? item.type;
  const priceLabel = item.price != null ? `${item.price.toFixed(2)} €` : "Gratis";
  const ribbons = getContentRibbons(item, { contentId: item.id, ownedIds });

  return (
    <a
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl"
    >
      <ContentCover
        coverUrl={item.cover_url}
        title={item.title}
        type={item.type}
        ribbons={ribbons}
        className="w-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="translate-y-4 bg-gradient-to-t from-[#3d2b1f]/95 via-[#3d2b1f]/55 to-transparent px-4 pb-4 pt-20 transition-transform duration-300 ease-out group-hover:translate-y-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/65">{label}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</h3>
          {item.author && (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/75">{item.author}</p>
          )}
          <p className="mt-2 text-sm font-semibold text-white">{priceLabel}</p>
        </div>
      </div>
    </a>
  );
}
