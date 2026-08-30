import type { ContentRibbonKind } from "@/lib/content-ribbons";
import { RIBBON_META } from "@/lib/content-ribbons";
import { cn } from "@/lib/utils";

const SIZE_CONFIG = {
  sm: { box: 44, band: 82, font: 7, top: 11, offset: -25, pad: 2 },
  md: { box: 56, band: 102, font: 8, top: 15, offset: -31, pad: 3 },
  lg: { box: 72, band: 124, font: 9, top: 19, offset: -38, pad: 4 },
} as const;

export function ContentRibbon({
  kind,
  size = "md",
  className,
}: {
  kind: ContentRibbonKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = RIBBON_META[kind];
  const config = SIZE_CONFIG[size];

  return (
    <div
      className={cn("pointer-events-none absolute left-0 top-0 z-10 overflow-hidden", className)}
      style={{ width: config.box, height: config.box }}
      title={meta.label}
      aria-label={meta.alt}
    >
      <span
        className="absolute block text-center font-bold uppercase tracking-wide text-white shadow-sm"
        style={{
          width: config.band,
          top: config.top,
          left: config.offset,
          fontSize: config.font,
          paddingTop: config.pad,
          paddingBottom: config.pad,
          transform: "rotate(-45deg)",
          backgroundColor: meta.color,
        }}
      >
        {meta.ribbonText}
      </span>
    </div>
  );
}
