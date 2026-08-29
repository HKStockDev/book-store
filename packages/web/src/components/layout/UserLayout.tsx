"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen, Bookmark, CreditCard, Home, Library, List, LogOut, Search, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { UserAvatar } from "@/components/shared/UserAvatar";

const NAV = [
  { href: "/browse", label: "Explorar", icon: Search },
  { href: "/library", label: "Mi biblioteca", icon: Library },
  { href: "/lists", label: "Listas", icon: List },
  { href: "/subscription", label: "Suscripción", icon: CreditCard },
  { href: "/profile", label: "Perfil", icon: User },
];

export function UserLayout({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/browse" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">IWWEI</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname.startsWith(href) ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
              title="Mi perfil"
            >
              <UserAvatar
                name={user?.fullName}
                email={user?.email}
                avatarUrl={user?.avatarUrl}
                size="sm"
              />
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user?.fullName ?? user?.email}
              </span>
            </Link>
            <button onClick={handleLogout} className="btn-ghost p-2" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
