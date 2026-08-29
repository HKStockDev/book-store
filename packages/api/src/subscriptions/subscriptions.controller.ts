import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";
import type { AuthUser } from "../common/types";
import { SupabaseService } from "../supabase/supabase.service";

const PLANS = {
  basic: { name: "Básica", price: 4.99, features: ["Acceso a noticias", "5 descargas offline/mes"] },
  premium: { name: "Premium", price: 9.99, features: ["Todo el catálogo", "Descargas ilimitadas", "Sin anuncios"] },
  family: { name: "Familiar", price: 14.99, features: ["Hasta 5 perfiles", "Todo Premium", "Contenido infantil"] },
};

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get("plans")
  getPlans() {
    return PLANS;
  }

  @Get("me")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async getMySubscription(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  @Post("subscribe")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("user")
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body("plan") plan: keyof typeof PLANS,
  ) {
    const planInfo = PLANS[plan];
    if (!planInfo) throw new Error("Invalid plan");

    await this.supabase
      .getAdminClient()
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "active");

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: sub, error: subError } = await this.supabase
      .getAdminClient()
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan,
        status: "active",
        price: planInfo.price,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (subError) throw new Error(subError.message);

    await this.supabase.getAdminClient().from("payments").insert({
      user_id: user.id,
      type: "subscription",
      description: `Suscripción ${planInfo.name} — Mensual`,
      amount: planInfo.price,
      status: "completed",
    });

    return sub;
  }
}
