export interface SubscriptionPlanInfo {
  name: string;
  price: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanInfo> = {
  basic: {
    name: "Básica",
    price: 4.99,
    features: ["Acceso a noticias", "5 descargas offline/mes"],
  },
  premium: {
    name: "Premium",
    price: 9.99,
    features: ["Todo el catálogo", "Descargas ilimitadas", "Sin anuncios"],
  },
  family: {
    name: "Familiar",
    price: 14.99,
    features: ["Hasta 5 perfiles", "Todo Premium", "Contenido infantil"],
  },
};

export const PLAN_ORDER = ["basic", "premium", "family"] as const;

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => [id, plan.name]),
);
