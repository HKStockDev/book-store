import { cn } from "@/lib/utils";

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

export function ContentCard({ item, href }: { item: { id: string; title: string; type: string; price?: number | null; cover_url?: string; author?: string }; href: string }) {
  return (
    <a href={href} className="group card overflow-hidden p-0 transition-shadow hover:shadow-md">
      <div className="aspect-[3/4] bg-secondary">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">Sin portada</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase text-muted-foreground">{item.type}</p>
        <h3 className="mt-1 font-semibold group-hover:text-primary">{item.title}</h3>
        {item.author && <p className="text-sm text-muted-foreground">{item.author}</p>}
        <p className="mt-2 text-sm font-medium">
          {item.price != null ? `${item.price.toFixed(2)} €` : "Gratis"}
        </p>
      </div>
    </a>
  );
}
