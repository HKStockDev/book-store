import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("stats")
  async stats(@CurrentUser() user: AuthUser) {
    const db = this.supabase.getAdminClient();

    if (user.role === "admin") {
      const [users, editorials, content, payments, promotions, settlements] = await Promise.all([
        db.from("profiles").select("id, status"),
        db.from("editorials").select("id, status, name, total_revenue"),
        db.from("content_items").select("impressions"),
        db.from("payments").select("amount, status, type, created_at"),
        db.from("promotions").select("id, status, name, editorial_id, impressions, clicks, editorials(name)").eq(
          "status",
          "active",
        ),
        db.from("cpm_settlements").select("id, editorial_id, period, amount, status, editorials(name)"),
      ]);

      const completedPayments = (payments.data ?? []).filter((p) => p.status === "completed");
      const totalImpressions = (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0);
      const monthlyRevenue = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
      const activeSubscriptions = completedPayments.filter((p) => p.type === "subscription").length;

      const revenueByMonth = new Map<string, number>();
      for (const payment of completedPayments) {
        const month = payment.created_at?.slice(0, 7) ?? "unknown";
        revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + Number(payment.amount));
      }

      const topEditorials = [...(editorials.data ?? [])]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .slice(0, 5)
        .map((ed) => ({
          name: ed.name,
          revenue: Number(ed.total_revenue),
          impressions: 0,
        }));

      return {
        totalUsers: users.data?.length ?? 0,
        activeSubscriptions,
        monthlyRevenue,
        totalContent: content.data?.length ?? 0,
        totalImpressions,
        pendingSettlements: (settlements.data ?? []).filter((s) => s.status === "pending").length,
        activePromotions: promotions.data?.length ?? 0,
        pendingEditorials: (editorials.data ?? []).filter((e) => e.status === "pending").length,
        totalEditorials: editorials.data?.length ?? 0,
        revenueByMonth: [...revenueByMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, revenue]) => ({
            month: month.slice(5),
            revenue,
          })),
        topEditorials,
        pendingSettlementRows: (settlements.data ?? [])
          .filter((s) => s.status === "pending")
          .map((s) => ({
            id: s.id,
            editorialName: (s.editorials as { name?: string } | null)?.name ?? "-",
            period: s.period,
            amount: Number(s.amount),
          })),
        activePromotionRows: (promotions.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          editorialName: (p.editorials as { name?: string } | null)?.name ?? "-",
          impressions: Number(p.impressions),
          clicks: Number(p.clicks),
        })),
      };
    }

    if (user.role === "publisher" && user.editorialId) {
      const [content, promotions, settlements] = await Promise.all([
        db.from("content_items").select("impressions, purchases").eq("editorial_id", user.editorialId),
        db.from("promotions").select("*").eq("editorial_id", user.editorialId),
        db.from("cpm_settlements").select("amount, status").eq("editorial_id", user.editorialId),
      ]);

      return {
        contentCount: content.data?.length ?? 0,
        totalImpressions: (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0),
        totalPurchases: (content.data ?? []).reduce((s, c) => s + Number(c.purchases), 0),
        activePromotions: (promotions.data ?? []).filter((p) => p.status === "active").length,
        pendingSettlement: (settlements.data ?? [])
          .filter((s) => s.status === "pending")
          .reduce((s, x) => s + Number(x.amount), 0),
      };
    }

    const { data: payments } = await db
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      recentPayments: payments ?? [],
      message: "Bienvenido a IWWEI",
    };
  }
}
