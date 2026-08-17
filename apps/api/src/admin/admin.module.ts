import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
