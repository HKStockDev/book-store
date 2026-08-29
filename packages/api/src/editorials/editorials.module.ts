import { Module } from "@nestjs/common";
import { EditorialsController } from "./editorials.controller";

@Module({
  controllers: [EditorialsController],
})
export class EditorialsModule {}
