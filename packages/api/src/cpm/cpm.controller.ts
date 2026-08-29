import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("cpm")
@UseGuards(AuthGuard, RolesGuard)
export class CpmController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("settlements")
  @Roles("admin", "publisher")
  async getSettlements(@CurrentUser() user: AuthUser) {
    let query = this.supabase.getAdminClient().from("cpm_settlements").select("*, editorials(name)");

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query.order("period", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  @Post("settlements/calculate")
  @Roles("admin")
  async calculateSettlements(@Body("period") period: string) {
    const { data: editorials, error: edError } = await this.supabase
      .getAdminClient()
      .from("editorials")
      .select("id, cpm_rate")
      .eq("status", "active");

    if (edError) throw new Error(edError.message);

    const results = [];
    for (const ed of editorials ?? []) {
      const { data: content } = await this.supabase
        .getAdminClient()
        .from("content_items")
        .select("impressions")
        .eq("editorial_id", ed.id);

      const impressions = (content ?? []).reduce((sum, c) => sum + Number(c.impressions), 0);
      const amount = (impressions / 1000) * Number(ed.cpm_rate);

      const { data, error } = await this.supabase
        .getAdminClient()
        .from("cpm_settlements")
        .upsert(
          {
            editorial_id: ed.id,
            period,
            impressions,
            cpm_rate: ed.cpm_rate,
            amount,
            status: "pending",
          },
          { onConflict: "editorial_id,period" },
        )
        .select()
        .single();

      if (!error) results.push(data);
    }

    return results;
  }

  @Patch("settlements/:id/approve")
  @Roles("admin")
  async approveSettlement(@Param("id") id: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("cpm_settlements")
      .update({ status: "paid" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Get("dashboard")
  @Roles("admin", "publisher")
  async dashboard(@CurrentUser() user: AuthUser) {
    let settlementsQuery = this.supabase.getAdminClient().from("cpm_settlements").select("*");
    let contentQuery = this.supabase.getAdminClient().from("content_items").select("impressions");

    if (user.role === "publisher" && user.editorialId) {
      settlementsQuery = settlementsQuery.eq("editorial_id", user.editorialId);
      contentQuery = contentQuery.eq("editorial_id", user.editorialId);
    }

    const [{ data: settlements }, { data: content }] = await Promise.all([
      settlementsQuery,
      contentQuery,
    ]);

    const totalImpressions = (content ?? []).reduce((s, c) => s + Number(c.impressions), 0);
    const pendingAmount = (settlements ?? [])
      .filter((s) => s.status === "pending")
      .reduce((s, x) => s + Number(x.amount), 0);

    return { totalImpressions, pendingAmount, settlementCount: settlements?.length ?? 0 };
  }
}
