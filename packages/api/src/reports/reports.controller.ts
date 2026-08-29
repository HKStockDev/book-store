import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class ReportsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("summary")
  async summary() {
    const db = this.supabase.getAdminClient();

    const [users, editorials, content, payments, promotions, settlements] = await Promise.all([
      db.from("profiles").select("id, status, created_at"),
      db.from("editorials").select("id, name, status, total_revenue, content_count"),
      db.from("content_items").select("id, type, status, impressions, purchases"),
      db.from("payments").select("amount, status, type, created_at"),
      db.from("promotions").select("status, spent, impressions, conversions"),
      db.from("cpm_settlements").select("amount, status, period"),
    ]);

    const completedPayments = (payments.data ?? []).filter((p) => p.status === "completed");
    const totalRevenue = completedPayments.reduce((s, p) => s + Number(p.amount), 0);

    const revenueByMonth = new Map<string, number>();
    for (const payment of completedPayments) {
      const month = payment.created_at?.slice(0, 7) ?? "unknown";
      revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + Number(payment.amount));
    }

    return {
      totalUsers: users.data?.length ?? 0,
      activeUsers: users.data?.filter((u) => u.status === "active").length ?? 0,
      totalEditorials: editorials.data?.length ?? 0,
      totalContent: content.data?.length ?? 0,
      totalImpressions: (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0),
      totalPurchases: (content.data ?? []).reduce((s, c) => s + Number(c.purchases), 0),
      totalRevenue,
      subscriptionPayments: (payments.data ?? []).filter((p) => p.type === "subscription").length,
      purchasePayments: (payments.data ?? []).filter((p) => p.type === "purchase").length,
      activePromotions: (promotions.data ?? []).filter((p) => p.status === "active").length,
      promotionSpend: (promotions.data ?? []).reduce((s, p) => s + Number(p.spent), 0),
      pendingSettlements: (settlements.data ?? []).filter((s) => s.status === "pending").length,
      revenueByMonth: [...revenueByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, revenue]) => ({ month, revenue })),
      contentByType: Object.entries(
        (content.data ?? []).reduce<Record<string, number>>((acc, item) => {
          acc[item.type] = (acc[item.type] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([type, count]) => ({ type, count })),
    };
  }
}
