"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Calendar, CreditCard, Library, List, MessageSquare, Pencil, Save, Star, X,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { ActivityChart } from "@/components/shared/ActivityChart";
import { AvatarDropzone } from "@/components/shared/AvatarDropzone";
import { PageHeader } from "@/components/shared/PageHeader";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserProfile } from "@/lib/types";
import { PLAN_LABELS } from "@/lib/subscription-plans";
import { cn, formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { user, getToken, updateUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [editingInterests, setEditingInterests] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = async () => {
    const token = getToken();
    if (!token) return;
    const data = await api.profile.get(token);
    setProfile(data);
    setFullName(data.full_name ?? "");
    setAvatarUrl(data.avatar_url ?? "");
    setSelectedInterests(data.interests);
  };

  useEffect(() => {
    loadProfile().catch(console.error);
    api.onboarding.categories().then(setCategories).catch(console.error);
  }, [getToken]);

  const startEdit = () => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setEditing(false);
  };

  const saveProfile = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const updated = await api.profile.update({ fullName }, token);
      updateUser({ fullName: updated.full_name, avatarUrl: updated.avatar_url });
      setProfile((prev) =>
        prev
          ? { ...prev, full_name: updated.full_name, avatar_url: updated.avatar_url }
          : prev,
      );
      setEditing(false);
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    const token = getToken();
    if (!token) return;
    setUploadingAvatar(true);
    try {
      const { avatar_url } = await api.profile.uploadAvatar(file, token);
      setAvatarUrl(avatar_url);
      updateUser({ avatarUrl: avatar_url });
      setProfile((prev) => (prev ? { ...prev, avatar_url } : prev));
      toast.success("Avatar actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleInterest = (cat: string) => {
    setSelectedInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const saveInterests = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.onboarding.saveInterests(selectedInterests, token);
      setProfile((prev) => (prev ? { ...prev, interests: selectedInterests } : prev));
      setEditingInterests(false);
      toast.success("Intereses actualizados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <ProtectedRoute roles={["user"]}>
        <UserLayout>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </UserLayout>
      </ProtectedRoute>
    );
  }

  const displayName = profile.full_name ?? user?.email ?? "Usuario";
  const memberSince = new Date(profile.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <PageHeader title="Mi perfil" description="Gestiona tu cuenta y preferencias" />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile card */}
          <div className="card lg:col-span-2">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-3 sm:items-start">
                <AvatarDropzone
                  name={editing ? fullName : profile.full_name}
                  email={profile.email}
                  avatarUrl={avatarUrl || profile.avatar_url}
                  uploading={uploadingAvatar}
                  onFileSelect={uploadAvatar}
                />
                {!editing && (
                  <button onClick={startEdit} className="btn-ghost flex items-center gap-2 text-sm">
                    <Pencil className="h-4 w-4" />
                    Editar perfil
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                {editing ? (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Nombre completo</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input w-full"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={cancelEdit} className="btn-ghost flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold">{displayName}</h2>
                      <p className="text-muted-foreground">{profile.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Miembro desde {memberSince}
                      </span>
                      {profile.onboarding_completed && (
                        <span className="badge bg-green-100 text-green-800">Perfil completo</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats & activity chart */}
          <div className="card space-y-4">
            <h3 className="font-semibold">Actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/library" className="rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary">
                <Library className="mb-1 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{profile.stats.libraryCount}</p>
                <p className="text-xs text-muted-foreground">Biblioteca</p>
              </Link>
              <Link href="/lists" className="rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary">
                <List className="mb-1 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{profile.stats.listsCount}</p>
                <p className="text-xs text-muted-foreground">Listas</p>
              </Link>
              <div className="rounded-lg bg-secondary/50 p-3">
                <MessageSquare className="mb-1 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{profile.stats.reviewsCount}</p>
                <p className="text-xs text-muted-foreground">Reseñas</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <BookOpen className="mb-1 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{profile.stats.purchasesCount}</p>
                <p className="text-xs text-muted-foreground">Compras</p>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <CreditCard className="h-5 w-5 text-primary" />
                Suscripción
              </h3>
              <Link href="/subscription" className="text-sm text-primary hover:underline">
                Ver planes
              </Link>
            </div>
            {profile.subscription ? (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="font-medium">
                  Plan {PLAN_LABELS[profile.subscription.plan] ?? profile.subscription.plan}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(profile.subscription.price)}/mes · Expira{" "}
                  {new Date(profile.subscription.expires_at).toLocaleDateString("es-ES")}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No tienes una suscripción activa.{" "}
                <Link href="/subscription" className="text-primary hover:underline">
                  Explorar planes
                </Link>
              </p>
            )}
          </div>

          {/* Interests */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Star className="h-5 w-5 text-primary" />
                Intereses
              </h3>
              {!editingInterests && (
                <button
                  onClick={() => {
                    setSelectedInterests(profile.interests);
                    setEditingInterests(true);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
            {editingInterests ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleInterest(cat)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        selectedInterests.includes(cat)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveInterests} disabled={saving} className="btn-primary text-sm">
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInterests(profile.interests);
                      setEditingInterests(false);
                    }}
                    className="btn-ghost text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : profile.interests.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((cat) => (
                  <span key={cat} className="badge">{cat}</span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no has seleccionado intereses.
              </p>
            )}
          </div>

          {/* Activity history */}
          {profile.activityHistory && (
            <div className="card lg:col-span-3">
              <h3 className="font-semibold">Tu actividad reciente</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Lecturas, reseñas y compras de los últimos 6 meses
              </p>
              <div className="mt-4">
                <ActivityChart data={profile.activityHistory} />
              </div>
            </div>
          )}

          {/* Recent payments */}
          {profile.recentPayments.length > 0 && (
            <div className="card lg:col-span-3">
              <h3 className="font-semibold">Pagos recientes</h3>
              <div className="mt-4 divide-y divide-border">
                {profile.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                      <span className={cn(
                        "badge text-xs",
                        payment.status === "completed" ? "bg-green-100 text-green-800" : "bg-secondary",
                      )}>
                        {payment.status === "completed" ? "Completado" : payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
