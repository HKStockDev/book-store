"use client";

import { useEffect, useState } from "react";
import { isAuthStorageAvailable } from "./auth-storage";
import { useAuthStore } from "./auth-store";

/** True once persisted auth state has been restored from localStorage. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(
    () => isAuthStorageAvailable() && (useAuthStore.persist?.hasHydrated?.() ?? true),
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    void useAuthStore.persist.rehydrate();
    return unsub;
  }, []);

  return hydrated;
}
