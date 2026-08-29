"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

/** Ensures zustand persist rehydrates on the client as early as possible. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated()) {
      void useAuthStore.persist.rehydrate();
    }
  }, []);

  return children;
}
