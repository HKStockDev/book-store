import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("library")
@UseGuards(AuthGuard, RolesGuard)
@Roles("user")
export class LibraryController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_library")
      .select("*, content_items(*, editorials(name))")
      .eq("user_id", user.id)
      .order("last_read_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":contentId/progress")
  async updateProgress(
    @CurrentUser() user: AuthUser,
    @Param("contentId") contentId: string,
    @Body("progress") progress: number,
  ) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_library")
      .update({ progress, last_read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("content_id", contentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":contentId/offline")
  async toggleOffline(
    @CurrentUser() user: AuthUser,
    @Param("contentId") contentId: string,
    @Body("offline") offline: boolean,
  ) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_library")
      .update({ offline_available: offline })
      .eq("user_id", user.id)
      .eq("content_id", contentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
