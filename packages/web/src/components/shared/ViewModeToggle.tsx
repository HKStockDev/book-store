import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

export function ViewModeToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-card p-1", className)}>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          value === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
        )}
        title="Vista en mosaico"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Mosaico</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          value === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
        )}
        title="Vista en lista"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>
    </div>
  );
}
