"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/lib/types";

export function ProtectedRoute({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      const redirect = user.role === "admin" ? "/admin" : user.role === "publisher" ? "/publisher" : "/browse";
      router.replace(redirect);
    }
  }, [user, roles, router]);

  if (!user || (roles && !roles.includes(user.role))) return null;
  return <>{children}</>;
}
