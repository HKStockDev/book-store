export type UserRole = "admin" | "publisher" | "user";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  editorialId: string | null;
  accessToken: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  editorial_id: string;
  status: string;
  price: number | null;
  author?: string;
  cover_url?: string;
  impressions: number;
  purchases: number;
  integration: string | null;
  published_at: string | null;
  editorials?: { name: string };
  reviews?: Review[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  profiles?: { full_name: string };
  created_at: string;
}

export interface Editorial {
  id: string;
  name: string;
  contact_email: string;
  status: string;
  cpm_rate: number;
  content_count: number;
  total_revenue: number;
  description?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: string;
  editorial_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  type: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export interface CpmSettlement {
  id: string;
  editorial_id: string;
  period: string;
  impressions: number;
  cpm_rate: number;
  amount: number;
  status: string;
  editorials?: { name: string };
}

export interface Promotion {
  id: string;
  name: string;
  editorial_id: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  editorials?: { name: string };
}

export interface DashboardStats {
  totalUsers?: number;
  totalEditorials?: number;
  totalContent?: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  totalImpressions?: number;
  pendingSettlements?: number;
  activePromotions?: number;
  editorialContent?: number;
  editorialImpressions?: number;
  editorialRevenue?: number;
  recentPayments?: Payment[];
}

export interface UserList {
  id: string;
  name: string;
  is_public: boolean;
  list_items?: { content_id: string; content_items: { title: string; type: string; cover_url?: string } }[];
}

export interface LibraryItem {
  id: string;
  progress: number;
  offline_available: boolean;
  last_read_at: string | null;
  content_items: ContentItem;
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  price: number;
  expires_at: string;
}
