import type { ContentRibbonKind } from "@/lib/content-ribbons";
import { RIBBON_META } from "@/lib/content-ribbons";
import { cn } from "@/lib/utils";

/** Premium corner-wrap ribbon: navy band, gold trim/text, tuck folds. */
const SIZE_CONFIG = {
  sm: { clip: 78, band: 128, font: 8, top: 18, left: -36, padY: 5, border: 1.5, fold: 7 },
  md: { clip: 96, band: 156, font: 10, top: 22, left: -44, padY: 6, border: 1.5, fold: 8 },
  lg: { clip: 118, band: 188, font: 12, top: 28, left: -52, padY: 7, border: 2, fold: 10 },
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
      style={{ width: config.clip, height: config.clip }}
      title={meta.label}
      aria-label={meta.alt}
    >
      {/* Gold tuck folds (sit behind the band, peek at card edges) */}
      <span
        aria-hidden
        className="absolute"
        style={{
          top: 0,
          left: config.clip - config.fold,
          width: config.fold,
          height: config.fold,
          background: "linear-gradient(135deg, #c9a227 0%, #8a7014 100%)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      />
      <span
        aria-hidden
        className="absolute"
        style={{
          top: config.clip - config.fold,
          left: 0,
          width: config.fold,
          height: config.fold,
          background: "linear-gradient(135deg, #c9a227 0%, #8a7014 100%)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      />

      {/* Diagonal navy band */}
      <span
        className="absolute block text-center font-semibold uppercase tracking-[0.14em]"
        style={{
          width: config.band,
          top: config.top,
          left: config.left,
          fontSize: config.font,
          paddingTop: config.padY,
          paddingBottom: config.padY,
          transform: "rotate(-45deg)",
          color: "#e8c547",
          background: "linear-gradient(180deg, #1a2a4a 0%, #0c1628 55%, #081018 100%)",
          borderTop: `${config.border}px solid #d4af37`,
          borderBottom: `${config.border}px solid #d4af37`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {meta.ribbonText}
      </span>
    </div>
  );
}
