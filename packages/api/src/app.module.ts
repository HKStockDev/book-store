import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CommonModule } from "./common/common.module";
import { ContentModule } from "./content/content.module";
import { CpmModule } from "./cpm/cpm.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { EditorialsModule } from "./editorials/editorials.module";
import { LibraryModule } from "./library/library.module";
import { ListsModule } from "./lists/lists.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { PaymentsModule } from "./payments/payments.module";
import { ReportsModule } from "./reports/reports.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SettingsModule } from "./settings/settings.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    EditorialsModule,
    ContentModule,
    CatalogModule,
    LibraryModule,
    ListsModule,
    ReviewsModule,
    SubscriptionsModule,
    OnboardingModule,
    CpmModule,
    PromotionsModule,
    DashboardModule,
    PaymentsModule,
    ReportsModule,
    SettingsModule,
  ],
})
export class AppModule {}
