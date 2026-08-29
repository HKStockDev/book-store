"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const getToken = useAuthStore((s) => s.getToken);
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    api.onboarding.categories().then(setCategories);
  }, []);

  const toggle = (cat: string) => {
    setSelected((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const save = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await api.onboarding.saveInterests(selected, token);
      toast.success("Preferencias guardadas");
      router.push("/browse");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <ProtectedRoute roles={["user"]}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-lg">
          <h1 className="text-2xl font-bold">¿Qué te interesa?</h1>
          <p className="mt-1 text-muted-foreground">Selecciona tus categorias favoritas para personalizar tu experiencia</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  selected.includes(cat) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <button onClick={save} className="btn-primary mt-8 w-full" disabled={selected.length === 0}>
            Continuar
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
