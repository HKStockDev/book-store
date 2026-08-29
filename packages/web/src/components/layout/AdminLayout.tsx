"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, BookOpen, CreditCard, FileText, LayoutDashboard,
  LogOut, Megaphone, Settings, Users, Building2, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/editorials", label: "Editoriales", icon: Building2 },
  { href: "/admin/content", label: "Contenido", icon: BookOpen },
  { href: "/admin/payments", label: "Pagos", icon: CreditCard },
  { href: "/admin/cpm", label: "CPM", icon: DollarSign },
  { href: "/admin/promotions", label: "Promociones", icon: Megaphone },
  { href: "/admin/reports", label: "Informes", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
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
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border p-6">
        <h1 className="text-xl font-bold text-primary">IWWEI</h1>
        <p className="text-xs text-muted-foreground">Panel de administración</p>
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
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <button onClick={handleLogout} className="btn-ghost mt-2 w-full justify-start text-destructive">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
