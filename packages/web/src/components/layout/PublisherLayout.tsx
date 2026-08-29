"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, DollarSign, LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

const NAV = [
  { href: "/publisher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/publisher/content", label: "Contenido", icon: BookOpen },
  { href: "/publisher/promotions", label: "Promociones", icon: Megaphone },
  { href: "/publisher/cpm", label: "CPM", icon: DollarSign },
];

export function PublisherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, getToken } = useAuthStore();

  const handleLogout = async () => {
    const token = getToken();
    if (token) await api.auth.logout(token).catch(() => {});
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
        <div className="border-b border-border p-6">
          <h1 className="text-xl font-bold text-primary">IWWEI</h1>
          <p className="text-xs text-muted-foreground">Portal editorial</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === href ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <button onClick={handleLogout} className="btn-ghost mt-2 w-full justify-start text-destructive">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
