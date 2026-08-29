import type { AuthUser } from "./types";

/** Read persisted session synchronously on the client to avoid refresh flashes. */
export function readPersistedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("iwwei-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { user?: AuthUser | null } };
    return parsed.state?.user ?? null;
  } catch {
    return null;
  }
}

export function isAuthStorageAvailable() {
  return typeof window !== "undefined";
}
