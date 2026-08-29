import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("content")
@UseGuards(AuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @Roles("admin", "publisher")
  async findAll(@CurrentUser() user: AuthUser) {
    let query = this.supabase
      .getAdminClient()
      .from("content_items")
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
      title: string;
      type: string;
      editorialId?: string;
      price?: number;
      integration?: string;
      cover_url?: string;
      author?: string;
      description?: string;
    },
  ) {
    const editorialId =
      user.role === "publisher" ? user.editorialId : (body.editorialId ?? null);

    if (!editorialId) {
      throw new Error("editorialId is required");
    }

    const { data, error } = await this.supabase
      .getAdminClient()
      .from("content_items")
      .insert({
        title: body.title,
        type: body.type,
        editorial_id: editorialId,
        price: body.price ?? null,
        integration: body.integration ?? null,
        cover_url: body.cover_url ?? null,
        author: body.author ?? null,
        description: body.description ?? null,
        status: user.role === "publisher" ? "review" : "draft",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id")
  @Roles("admin", "publisher")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      cover_url?: string;
      author?: string;
      description?: string;
      price?: number;
      integration?: string;
    },
  ) {
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.cover_url !== undefined) updates.cover_url = body.cover_url;
    if (body.author !== undefined) updates.author = body.author;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.integration !== undefined) updates.integration = body.integration;

    let query = this.supabase
      .getAdminClient()
      .from("content_items")
      .update(updates)
      .eq("id", id);

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query.select().single();
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
      .from("content_items")
      .update({
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("editorial_id", user.editorialId);
    }

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}
