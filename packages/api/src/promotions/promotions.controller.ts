import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("promotions")
@UseGuards(AuthGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @Roles("admin", "publisher")
  async findAll(@CurrentUser() user: AuthUser) {
    let query = this.supabase
      .getAdminClient()
      .from("promotions")
      .select("*, editorials(name)");

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  @Post()
  @Roles("admin", "publisher")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      editorialId?: string;
      startDate: string;
      endDate: string;
      budget: number;
    },
  ) {
    const editorialId =
      user.role === "publisher" ? user.editorialId : (body.editorialId ?? null);

    if (!editorialId) throw new Error("editorialId is required");

    const { data, error } = await this.supabase
      .getAdminClient()
      .from("promotions")
      .insert({
        name: body.name,
        editorial_id: editorialId,
        start_date: body.startDate,
        end_date: body.endDate,
        budget: body.budget,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id/status")
  @Roles("admin", "publisher")
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    let query = this.supabase
      .getAdminClient()
      .from("promotions")
      .update({ status })
      .eq("id", id);

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Get("reports/summary")
  @Roles("admin", "publisher")
  async reportSummary(@CurrentUser() user: AuthUser) {
    let query = this.supabase.getAdminClient().from("promotions").select("*");

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const promotions = data ?? [];
    return {
      totalCampaigns: promotions.length,
      activeCampaigns: promotions.filter((p) => p.status === "active").length,
      totalSpent: promotions.reduce((s, p) => s + Number(p.spent), 0),
      totalImpressions: promotions.reduce((s, p) => s + Number(p.impressions), 0),
      totalConversions: promotions.reduce((s, p) => s + Number(p.conversions), 0),
    };
  }
}
