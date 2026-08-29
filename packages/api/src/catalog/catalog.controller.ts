import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async browse(
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("category") category?: string,
  ) {
    let query = this.supabase
      .getAdminClient()
      .from("content_items")
      .select("*, editorials(name)")
      .eq("status", "published");

    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("title", `%${search}%`);
    if (category) query = query.eq("type", category);

    const { data, error } = await query.order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("content_items")
      .select("*, editorials(name, id)")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (error) throw new Error(error.message);

    const { data: reviews } = await this.supabase
      .getAdminClient()
      .from("reviews")
      .select("*, profiles(full_name)")
      .eq("content_id", id)
      .order("created_at", { ascending: false });

    return { ...data, reviews: reviews ?? [] };
  }

  @Post(":id/impression")
  async recordImpression(@Param("id") id: string) {
    const { data: item } = await this.supabase
      .getAdminClient()
      .from("content_items")
      .select("impressions")
      .eq("id", id)
      .single();

    if (item) {
      await this.supabase
        .getAdminClient()
        .from("content_items")
        .update({ impressions: (item.impressions ?? 0) + 1 })
        .eq("id", id);
    }

    return { success: true };
  }

  @Post(":id/purchase")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async purchase(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const { data: content, error: contentError } = await this.supabase
      .getAdminClient()
      .from("content_items")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (contentError || !content) throw new Error("Content not found");

    const amount = content.price ?? 0;

    const { data: payment, error: payError } = await this.supabase
      .getAdminClient()
      .from("payments")
      .insert({
        user_id: user.id,
        type: "purchase",
        description: content.title,
        amount,
        status: "completed",
        content_id: id,
      })
      .select()
      .single();

    if (payError) throw new Error(payError.message);

    await this.supabase.getAdminClient().from("user_library").upsert(
      { user_id: user.id, content_id: id, progress: 0 },
      { onConflict: "user_id,content_id" },
    );

    await this.supabase
      .getAdminClient()
      .from("content_items")
      .update({ purchases: (content.purchases ?? 0) + 1 })
      .eq("id", id);

    return { payment, success: true };
  }
}
