import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("es-ES").format(n);
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  book: "Libro",
  comic: "Cómico",
  podcast: "Podcast",
  news: "Noticias",
  document: "Documento",
};

export const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
  review: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
};
