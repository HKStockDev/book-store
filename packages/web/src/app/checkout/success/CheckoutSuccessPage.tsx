"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserLayout } from "@/components/layout/UserLayout";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const getToken = useAuthStore((s) => s.getToken);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = getToken();
    if (!token || !sessionId) {
      setStatus(sessionId ? "loading" : "error");
      return;
    }
    api.stripe.getSession(sessionId, token)
      .then((s) => setStatus(s.paymentStatus === "paid" ? "success" : "loading"))
      .catch(() => setStatus("error"));
  }, [sessionId, getToken]);

  return (
    <ProtectedRoute roles={["user"]}>
      <UserLayout>
        <div className="mx-auto max-w-md py-16 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Confirmando pago...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h1 className="mt-4 text-2xl font-bold">¡Pago completado!</h1>
              <p className="mt-2 text-muted-foreground">Tu compra o suscripción ha sido procesada correctamente.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/library" className="btn-primary">Ir a mi biblioteca</Link>
                <Link href="/browse" className="btn-secondary">Seguir explorando</Link>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-2xl font-bold">Error al verificar el pago</h1>
              <p className="mt-2 text-muted-foreground">Contacta con soporte si se te ha cobrado.</p>
              <Link href="/browse" className="btn-primary mt-6 inline-block">Volver</Link>
            </>
          )}
        </div>
      </UserLayout>
    </ProtectedRoute>
  );
}
