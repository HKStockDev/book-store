"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, BookOpen, CreditCard,
  LogOut, Megaphone, Settings, Users, Building2, DollarSign, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { SidebarMain, SidebarShell } from "./SidebarShell";

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
    <SidebarShell
      header={
        <>
          <h1 className="text-xl font-bold text-primary">IWWEI</h1>
          <p className="text-xs text-muted-foreground">Panel de administración</p>
        </>
      }
      footer={
        <>
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <button onClick={handleLogout} className="btn-ghost mt-2 w-full justify-start text-destructive">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </>
      }
    >
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </SidebarShell>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebar />
      <SidebarMain>{children}</SidebarMain>
    </>
  );
}
