import { Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async findAll() {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id/role/:role")
  async updateRole(@Param("id") id: string, @Param("role") role: string) {
    return this.supabase.updateProfile(id, { role: role as "admin" | "publisher" | "user" });
  }

  @Patch(":id/suspend")
  async suspend(@Param("id") id: string) {
    return this.supabase.updateProfile(id, { status: "suspended" });
  }

  @Patch(":id/activate")
  async activate(@Param("id") id: string) {
    return this.supabase.updateProfile(id, { status: "active" });
  }
}
