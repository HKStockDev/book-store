import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("lists")
@UseGuards(AuthGuard, RolesGuard)
@Roles("user")
export class ListsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_lists")
      .select("*, list_items(content_id, content_items(title, type, cover_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: { name: string; isPublic?: boolean }) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_lists")
      .insert({ user_id: user.id, name: body.name, is_public: body.isPublic ?? false })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Post(":listId/items")
  async addItem(
    @CurrentUser() user: AuthUser,
    @Param("listId") listId: string,
    @Body("contentId") contentId: string,
  ) {
    const { data: list } = await this.supabase
      .getAdminClient()
      .from("user_lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", user.id)
      .single();

    if (!list) throw new Error("List not found");

    const { data, error } = await this.supabase
      .getAdminClient()
      .from("list_items")
      .upsert({ list_id: listId, content_id: contentId }, { onConflict: "list_id,content_id" })
      .select("*, content_items(title, type, cover_url)")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Delete(":listId/items/:contentId")
  async removeItem(
    @CurrentUser() user: AuthUser,
    @Param("listId") listId: string,
    @Param("contentId") contentId: string,
  ) {
    const { data: list } = await this.supabase
      .getAdminClient()
      .from("user_lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", user.id)
      .single();

    if (!list) throw new Error("List not found");

    const { error } = await this.supabase
      .getAdminClient()
      .from("list_items")
      .delete()
      .eq("list_id", listId)
      .eq("content_id", contentId);

    if (error) throw new Error(error.message);
    return { success: true };
  }

  @Delete(":listId")
  async removeList(@CurrentUser() user: AuthUser, @Param("listId") listId: string) {
    const { error } = await this.supabase
      .getAdminClient()
      .from("user_lists")
      .delete()
      .eq("id", listId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
