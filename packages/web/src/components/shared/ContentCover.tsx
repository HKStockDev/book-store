import { cn } from "@/lib/utils";

export function ContentCover({
  coverUrl,
  title,
  className,
  aspectClass = "aspect-[3/4]",
}: {
  coverUrl?: string | null;
  title: string;
  className?: string;
  aspectClass?: string;
}) {
  return (
    <div className={cn(aspectClass, "overflow-hidden bg-secondary shrink-0", className)}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={`Portada de ${title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          Sin portada
        </div>
      )}
    </div>
  );
}
