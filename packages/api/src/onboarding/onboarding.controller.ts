import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

export const INTEREST_CATEGORIES = [
  "Ficción",
  "No ficción",
  "Cómics",
  "Podcasts",
  "Noticias",
  "Documentos",
  "Historia",
  "Ciencia",
  "Arte",
  "Infantil",
];

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("categories")
  getCategories() {
    return INTEREST_CATEGORIES;
  }

  @Get("interests")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async getInterests(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("user_interests")
      .select("category")
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
    return (data ?? []).map((i) => i.category);
  }

  @Post("interests")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async saveInterests(@CurrentUser() user: AuthUser, @Body("categories") categories: string[]) {
    await this.supabase.getAdminClient().from("user_interests").delete().eq("user_id", user.id);

    if (categories.length) {
      const rows = categories.map((category) => ({ user_id: user.id, category }));
      const { error } = await this.supabase.getAdminClient().from("user_interests").insert(rows);
      if (error) throw new Error(error.message);
    }

    await this.supabase
      .getAdminClient()
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    return { success: true, categories };
  }
}
