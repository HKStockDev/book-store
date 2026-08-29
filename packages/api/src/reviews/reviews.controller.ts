import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("content/:contentId")
  async findByContent(@Param("contentId") contentId: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("reviews")
      .select("*, profiles(full_name)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { contentId: string; rating: number; comment?: string },
  ) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("reviews")
      .upsert(
        {
          user_id: user.id,
          content_id: body.contentId,
          rating: body.rating,
          comment: body.comment ?? null,
        },
        { onConflict: "user_id,content_id" },
      )
      .select("*, profiles(full_name)")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const { error } = await this.supabase
      .getAdminClient()
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
