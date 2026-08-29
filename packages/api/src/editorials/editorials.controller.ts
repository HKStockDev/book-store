import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("editorials")
@UseGuards(AuthGuard, RolesGuard)
export class EditorialsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  @Roles("admin", "publisher")
  async findAll(@CurrentUser() user: AuthUser) {
    let query = this.supabase.getAdminClient().from("editorials").select("*");

    if (user.role === "publisher" && user.editorialId) {
      query = query.eq("id", user.editorialId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id/approve")
  @Roles("admin")
  async approve(@Param("id") id: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("editorials")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id/suspend")
  @Roles("admin")
  async suspend(@Param("id") id: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("editorials")
      .update({ status: "suspended" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id/cpm-rate")
  @Roles("admin")
  async updateCpmRate(@Param("id") id: string, @Body("cpmRate") cpmRate: number) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("editorials")
      .update({ cpm_rate: cpmRate })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  @Post()
  @Roles("admin")
  async create(
    @Body() body: { name: string; contactEmail: string; ownerId?: string; cpmRate?: number },
  ) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("editorials")
      .insert({
        name: body.name,
        contact_email: body.contactEmail,
        owner_id: body.ownerId ?? null,
        cpm_rate: body.cpmRate ?? 2.0,
        status: "active",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
