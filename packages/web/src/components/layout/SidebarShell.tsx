"use client";

import { cn } from "@/lib/utils";

export function SidebarShell({
  header,
  footer,
  children,
  className,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border p-6">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      <div className="shrink-0 border-t border-border p-4">{footer}</div>
    </aside>
  );
}

export function SidebarMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pl-64">
      <main className="min-h-screen overflow-auto p-8">{children}</main>
    </div>
  );
}
