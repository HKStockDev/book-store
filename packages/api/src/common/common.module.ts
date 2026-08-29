import { Global, Module } from "@nestjs/common";
import { AuthGuard, RolesGuard } from "./guards/auth.guard";

@Global()
@Module({
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class CommonModule {}
