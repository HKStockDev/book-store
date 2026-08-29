"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublisherLayout } from "@/components/layout/PublisherLayout";

export default function PublisherSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublisherLayout>
      <ProtectedRoute roles={["publisher"]}>{children}</ProtectedRoute>
    </PublisherLayout>
  );
}
