"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getHomeForRole } from "@/lib/auth-utils";
import { useAuthStore } from "@/lib/auth-store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import type { UserRole } from "@/lib/types";

export function ProtectedRoute({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace(getHomeForRole(user.role));
    }
  }, [hydrated, user, roles, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Cargando sesión...
      </div>
    );
  }

  if (!user || (roles && !roles.includes(user.role))) return null;

  return <>{children}</>;
}
