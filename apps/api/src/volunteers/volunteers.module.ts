import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VolunteersController } from "./volunteers.controller";
import { VolunteersService } from "./volunteers.service";

@Module({
  imports: [AuthModule],
  controllers: [VolunteersController],
  providers: [VolunteersService],
})
export class VolunteersModule {}
