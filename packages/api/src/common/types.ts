export type UserRole = "admin" | "publisher" | "user";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  editorial_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  editorialId: string | null;
  accessToken: string;
}

export interface Editorial {
  id: string;
  name: string;
  contact_email: string;
  owner_id: string | null;
  status: "active" | "pending" | "suspended";
  cpm_rate: number;
  content_count: number;
  total_revenue: number;
  created_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  editorial_id: string;
  status: string;
  price: number | null;
  impressions: number;
  purchases: number;
  integration: string | null;
  published_at: string | null;
}

export interface CpmSettlement {
  id: string;
  editorial_id: string;
  period: string;
  impressions: number;
  cpm_rate: number;
  amount: number;
  status: string;
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
}
