"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export function useOwnedContentIds() {
  const getToken = useAuthStore((s) => s.getToken);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setOwnedIds(new Set());
      setLoaded(true);
      return;
    }
    api.library.list(token)
      .then((items) => setOwnedIds(new Set(items.map((i) => i.content_items.id))))
      .catch(() => setOwnedIds(new Set()))
      .finally(() => setLoaded(true));
  }, [getToken]);

  return { ownedIds, loaded };
}
