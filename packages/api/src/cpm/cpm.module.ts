import { Module } from "@nestjs/common";
import { CpmController } from "./cpm.controller";

@Module({
  controllers: [CpmController],
})
export class CpmModule {}
