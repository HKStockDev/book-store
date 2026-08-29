import type {
  AuthUser,
  ContentItem,
  CpmSettlement,
  DashboardStats,
  Editorial,
  LibraryItem,
  Payment,
  Profile,
  Promotion,
  Review,
  Subscription,
  UserList,
  UserProfile,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: AuthUser; session: { accessToken: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signup: (data: { email: string; password: string; fullName: string; role?: string; editorialName?: string }) =>
      request<{ user: AuthUser; session: { accessToken: string } }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: (token: string) => request<{ user: AuthUser; editorial: Editorial | null }>("/auth/me", {}, token),
    logout: (token: string) => request("/auth/logout", { method: "POST" }, token),
  },

  catalog: {
    browse: (params?: { type?: string; genre?: string; search?: string }) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>,
      ).toString();
      return request<ContentItem[]>(`/catalog${q ? `?${q}` : ""}`);
    },
    categories: () => request<{ name: string; count: number }[]>("/catalog/categories"),
    get: (id: string) => request<ContentItem>(`/catalog/${id}`),
  },

  stripe: {
    checkoutPurchase: (contentId: string, token: string) =>
      request<{ url: string; sessionId: string }>("/stripe/checkout/purchase", {
        method: "POST",
        body: JSON.stringify({ contentId }),
      }, token),
    checkoutSubscription: (plan: string, token: string) =>
      request<{ url: string; sessionId: string }>("/stripe/checkout/subscription", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }, token),
    getSession: (sessionId: string, token: string) =>
      request<{ status: string; paymentStatus: string; type: string }>(`/stripe/session/${sessionId}`, {}, token),
  },

  library: {
    list: (token: string) => request<LibraryItem[]>("/library", {}, token),
    updateProgress: (contentId: string, progress: number, token: string) =>
      request(`/library/${contentId}/progress`, { method: "PATCH", body: JSON.stringify({ progress }) }, token),
    toggleOffline: (contentId: string, offline: boolean, token: string) =>
      request(`/library/${contentId}/offline`, { method: "PATCH", body: JSON.stringify({ offline }) }, token),
  },

  lists: {
    all: (token: string) => request<UserList[]>("/lists", {}, token),
    create: (name: string, token: string, isPublic = false) =>
      request<UserList>("/lists", { method: "POST", body: JSON.stringify({ name, isPublic }) }, token),
    update: (listId: string, data: { name?: string; isPublic?: boolean }, token: string) =>
      request<UserList>(`/lists/${listId}`, { method: "PATCH", body: JSON.stringify(data) }, token),
    delete: (listId: string, token: string) =>
      request<{ success: boolean }>(`/lists/${listId}`, { method: "DELETE" }, token),
    addItem: (listId: string, contentId: string, token: string) =>
      request(`/lists/${listId}/items`, { method: "POST", body: JSON.stringify({ contentId }) }, token),
    removeItem: (listId: string, contentId: string, token: string) =>
      request(`/lists/${listId}/items/${contentId}`, { method: "DELETE" }, token),
  },

  reviews: {
    create: (data: { contentId: string; rating: number; comment?: string }, token: string) =>
      request<Review>("/reviews", { method: "POST", body: JSON.stringify(data) }, token),
  },

  subscriptions: {
    plans: () => request<Record<string, { name: string; price: number; features: string[] }>>("/subscriptions/plans"),
    me: (token: string) => request<Subscription | null>("/subscriptions/me", {}, token),
  },

  onboarding: {
    categories: () => request<string[]>("/onboarding/categories"),
    interests: (token: string) => request<string[]>("/onboarding/interests", {}, token),
    saveInterests: (categories: string[], token: string) =>
      request("/onboarding/interests", { method: "POST", body: JSON.stringify({ categories }) }, token),
  },

  profile: {
    get: (token: string) => request<UserProfile>("/profile", {}, token),
    update: (data: { fullName?: string; avatarUrl?: string }, token: string) =>
      request<{ id: string; email: string; full_name: string | null; avatar_url: string | null }>(
        "/profile",
        { method: "PATCH", body: JSON.stringify(data) },
        token,
      ),
  },

  dashboard: {
    stats: (token: string) => request<DashboardStats>("/dashboard/stats", {}, token),
  },

  users: {
    list: (token: string) => request<Profile[]>("/users", {}, token),
    setRole: (id: string, role: string, token: string) =>
      request(`/users/${id}/role/${role}`, { method: "PATCH" }, token),
    suspend: (id: string, token: string) => request(`/users/${id}/suspend`, { method: "PATCH" }, token),
    activate: (id: string, token: string) => request(`/users/${id}/activate`, { method: "PATCH" }, token),
  },

  editorials: {
    list: (token: string) => request<Editorial[]>("/editorials", {}, token),
    approve: (id: string, token: string) => request(`/editorials/${id}/approve`, { method: "PATCH" }, token),
    suspend: (id: string, token: string) => request(`/editorials/${id}/suspend`, { method: "PATCH" }, token),
    setCpmRate: (id: string, cpmRate: number, token: string) =>
      request(`/editorials/${id}/cpm-rate`, { method: "PATCH", body: JSON.stringify({ cpmRate }) }, token),
  },

  content: {
    list: (token: string) => request<ContentItem[]>("/content", {}, token),
    create: (data: {
      title: string;
      type: string;
      price?: number;
      integration?: string;
      cover_url?: string;
      author?: string;
      description?: string;
      editorialId?: string;
    }, token: string) =>
      request<ContentItem>("/content", { method: "POST", body: JSON.stringify(data) }, token),
    update: (id: string, data: {
      title?: string;
      cover_url?: string;
      author?: string;
      description?: string;
      price?: number;
      integration?: string;
    }, token: string) =>
      request<ContentItem>(`/content/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
    updateStatus: (id: string, status: string, token: string) =>
      request(`/content/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  },

  payments: {
    list: (token: string) => request<Payment[]>("/payments", {}, token),
  },

  cpm: {
    settlements: (token: string) => request<CpmSettlement[]>("/cpm/settlements", {}, token),
    calculate: (period: string, token: string) =>
      request("/cpm/settlements/calculate", { method: "POST", body: JSON.stringify({ period }) }, token),
    approve: (id: string, token: string) => request(`/cpm/settlements/${id}/approve`, { method: "PATCH" }, token),
    dashboard: (token: string) => request("/cpm/dashboard", {}, token),
  },

  promotions: {
    list: (token: string) => request<Promotion[]>("/promotions", {}, token),
    create: (data: Record<string, unknown>, token: string) =>
      request<Promotion>("/promotions", { method: "POST", body: JSON.stringify(data) }, token),
    updateStatus: (id: string, status: string, token: string) =>
      request(`/promotions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
    summary: (token: string) => request("/promotions/reports/summary", {}, token),
  },

  reports: {
    summary: (token: string) => request("/reports/summary", {}, token),
  },

  settings: {
    platform: (token: string) => request("/settings/platform", {}, token),
  },
};
