"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getHomeForRole } from "@/lib/auth-utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "user", editorialName: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(getHomeForRole(user.role));
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.signup({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        editorialName: form.role === "publisher" ? form.editorialName : undefined,
      });
      setAuth({ ...res.user, accessToken: res.session.accessToken });
      toast.success("Cuenta creada");
      router.push(form.role === "publisher" ? "/publisher" : "/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-2 text-2xl font-bold">Crear cuenta</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input" placeholder="Nombre completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" type="password" placeholder="Contraseña (mín. 8)" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">Usuario</option>
            <option value="publisher">Editorial</option>
          </select>
          {form.role === "publisher" && (
            <input className="input" placeholder="Nombre de la editorial" value={form.editorialName} onChange={(e) => setForm({ ...form, editorialName: e.target.value })} required />
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creando..." : "Registrarse"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary underline">¿Ya tienes cuenta?</Link>
        </p>
      </div>
    </div>
  );
}
