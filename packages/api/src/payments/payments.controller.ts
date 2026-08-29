import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

@Controller("payments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class PaymentsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async findAll(@CurrentUser() _user: AuthUser) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from("payments")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
