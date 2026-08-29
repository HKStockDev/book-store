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

  const roleAllowed = !roles || (!!user && roles.includes(user.role));

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

  if (user && roleAllowed) return <>{children}</>;
  if (!hydrated) return null;

  return null;
}
