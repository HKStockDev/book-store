"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <ProtectedRoute roles={["admin"]}>{children}</ProtectedRoute>
    </AdminLayout>
  );
}
