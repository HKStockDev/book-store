import type { ContentRibbonKind } from "@/lib/content-ribbons";
import { RIBBON_META } from "@/lib/content-ribbons";
import { cn } from "@/lib/utils";

export function ContentRibbon({
  kind,
  position = "left",
  size = "md",
  className,
}: {
  kind: ContentRibbonKind;
  position?: "left" | "right";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = RIBBON_META[kind];
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";

  return (
    <span
      className={cn(
        "pointer-events-none absolute top-0 z-10 drop-shadow-md",
        position === "left" ? "left-0" : "right-0 scale-x-[-1]",
        className,
      )}
      title={meta.label}
      aria-label={meta.alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.src} alt="" className={cn(sizeClass, "object-contain")} aria-hidden />
    </span>
  );
}

export function ContentRibbonStrip({
  kinds,
  size = "sm",
  className,
}: {
  kinds: ContentRibbonKind[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (!kinds.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {kinds.map((kind) => {
        const meta = RIBBON_META[kind];
        return (
          <span
            key={kind}
            className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ring-1 ring-border"
            title={meta.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meta.src} alt="" className={cn(size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
            {meta.shortLabel}
          </span>
        );
      })}
    </div>
  );
}
