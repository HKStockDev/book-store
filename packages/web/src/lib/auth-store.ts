"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  setAuth: (user: AuthUser) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  clearAuth: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      clearAuth: () => set({ user: null }),
      getToken: () => get().user?.accessToken ?? null,
    }),
    { name: "iwwei-auth", partialize: (state) => ({ user: state.user }) },
  ),
);
