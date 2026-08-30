"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_MS = 3500;
const DRAG_THRESHOLD = 6;

export function BookCarousel({
  children,
  className,
  autoplay = true,
}: {
  children: React.ReactNode;
  className?: string;
  autoplay?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const scrollByPage = useCallback((direction: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.75, 200);
    track.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  const autoAdvance = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    if (scrollLeft + clientWidth >= scrollWidth - 8) {
      track.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      scrollByPage("right");
    }
  }, [scrollByPage]);

  useEffect(() => {
    updateArrows();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(track);
    return () => observer.disconnect();
  }, [updateArrows, children]);

  useEffect(() => {
    if (!autoplay || paused) return;
    const id = window.setInterval(autoAdvance, AUTO_MS);
    return () => window.clearInterval(id);
  }, [autoplay, paused, autoAdvance]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    dragging.current = true;
    didDrag.current = false;
    startX.current = e.clientX;
    startScroll.current = track.scrollLeft;
    setPaused(true);
    setIsDragging(true);
    track.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > DRAG_THRESHOLD) didDrag.current = true;
    track.scrollLeft = startScroll.current - dx;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    window.setTimeout(() => setPaused(false), 1200);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  };

  return (
    <div
      className={cn("relative px-2", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {canPrev && (
        <button
          type="button"
          onClick={() => scrollByPage("left")}
          className="absolute left-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md transition hover:bg-accent"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => scrollByPage("right")}
          className="absolute right-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md transition hover:bg-accent"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={trackRef}
        onScroll={updateArrows}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          "flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto active:cursor-grabbing",
          "touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "select-none",
          !isDragging && "scroll-smooth",
        )}
      >
        {children}
      </div>
    </div>
  );
}
