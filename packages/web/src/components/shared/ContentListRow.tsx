import Link from "next/link";
import { ContentCover } from "./ContentCover";
import { Badge } from "./PageHeader";
import { CONTENT_TYPE_LABELS, cn, formatCurrency } from "@/lib/utils";

export function ContentListRow({
  href,
  title,
  type,
  coverUrl,
  author,
  subtitle,
  price,
  trailing,
  className,
}: {
  href?: string;
  title: string;
  type?: string;
  coverUrl?: string | null;
  author?: string | null;
  subtitle?: string | null;
  price?: number | null;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      <ContentCover
        coverUrl={coverUrl}
        title={title}
        type={type}
        className="w-14 rounded-md"
        aspectClass="aspect-[3/4]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {type && <Badge>{CONTENT_TYPE_LABELS[type] ?? type}</Badge>}
        </div>
        <h3 className="mt-1 truncate font-semibold">{title}</h3>
        {author && <p className="truncate text-sm text-muted-foreground">{author}</p>}
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        {price !== undefined && (
          <p className="mt-1 text-sm font-medium">
            {price != null ? formatCurrency(price) : "Gratis"}
          </p>
        )}
      </div>
      {trailing}
    </>
  );

  const classes = cn(
    "card flex items-center gap-4 transition-shadow hover:shadow-md",
    href && "group",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}
