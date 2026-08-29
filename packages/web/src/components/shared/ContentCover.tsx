"use client";

import { useEffect, useState } from "react";
import type { ContentRibbonKind } from "@/lib/content-ribbons";
import { getTypeFallback, resolveCoverFallback, resolveCoverUrl } from "@/lib/content-covers";
import { ContentRibbon } from "./ContentRibbon";
import { cn } from "@/lib/utils";

export function ContentCover({
  coverUrl,
  title,
  type,
  className,
  aspectClass = "aspect-[3/4]",
  variant = "default",
  ribbons = [],
}: {
  coverUrl?: string | null;
  title: string;
  type?: string;
  className?: string;
  aspectClass?: string;
  variant?: "default" | "hero";
  ribbons?: ContentRibbonKind[];
}) {
  const resolved = resolveCoverUrl(coverUrl, title, type);
  const [src, setSrc] = useState(resolved);
  const [fallbackStep, setFallbackStep] = useState(0);

  useEffect(() => {
    setSrc(resolveCoverUrl(coverUrl, title, type));
    setFallbackStep(0);
  }, [coverUrl, title, type]);

  const handleError = () => {
    if (fallbackStep >= 2) return;
    const nextStep = fallbackStep + 1;
    setFallbackStep(nextStep);
    if (nextStep === 1) {
      setSrc(resolveCoverFallback(src, title, type));
      return;
    }
    setSrc(getTypeFallback(type, `${title}-fallback`));
  };

  if (variant === "hero") {
    return (
      <div className={cn("relative mx-auto w-full max-w-xs", className)}>
        <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-xl" />
        <div className="relative overflow-hidden rounded-xl bg-secondary shadow-2xl ring-1 ring-border">
          <div className={cn(aspectClass, "relative w-full")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Portada de ${title}`}
              className="h-full w-full object-cover"
              onError={handleError}
            />
            {ribbons[0] && <ContentRibbon kind={ribbons[0]} position="left" size="lg" />}
            {ribbons[1] && <ContentRibbon kind={ribbons[1]} position="right" size="lg" />}
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 h-3 w-[88%] -translate-x-1/2 rounded-full bg-black/15 blur-md" />
      </div>
    );
  }

  return (
    <div className={cn(aspectClass, "relative overflow-hidden bg-secondary shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Portada de ${title}`}
        className="h-full w-full object-cover"
        onError={handleError}
        loading="lazy"
      />
      {ribbons[0] && <ContentRibbon kind={ribbons[0]} position="left" size="md" />}
      {ribbons[1] && <ContentRibbon kind={ribbons[1]} position="right" size="md" />}
    </div>
  );
}
