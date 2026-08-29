import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "IWWEI — Plataforma de contenidos digitales",
  description: "Libros, cómics, podcasts y noticias en un solo lugar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="sepia">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
