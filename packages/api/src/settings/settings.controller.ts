import { Controller, Get, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthGuard, RolesGuard } from "../common/guards/auth.guard";

@Controller("settings")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class SettingsController {
  constructor(private readonly config: ConfigService) {}

  @Get("platform")
  platform() {
    return {
      cpmDefaultRate: Number(this.config.get("CPM_DEFAULT_RATE") ?? 2.0),
      subscriptionPlans: [
        { id: "free", name: "Gratuito", price: 0, active: true },
        { id: "basic", name: "Básico", price: 4.99, active: true },
        { id: "premium", name: "Premium", price: 9.99, active: true },
        { id: "editorial", name: "Editorial", price: 0, active: true },
      ],
      integrations: {
        apryse: {
          enabled: Boolean(this.config.get("APRYSE_API_KEY")),
          apiKey: this.config.get("APRYSE_API_KEY") ?? "",
        },
        taddy: {
          enabled: Boolean(this.config.get("TADDY_API_KEY")),
          apiKey: this.config.get("TADDY_API_KEY") ?? "",
        },
        worldNews: {
          enabled: Boolean(this.config.get("WORLDNEWS_API_KEY")),
          apiKey: this.config.get("WORLDNEWS_API_KEY") ?? "",
        },
      },
      interestCategories: [
        "Ficción",
        "Historia",
        "Cómics",
        "Podcasts",
        "Noticias",
        "Ciencia",
        "Tecnología",
        "Romance",
        "Arte",
        "Documentos",
      ],
    };
  }
}
