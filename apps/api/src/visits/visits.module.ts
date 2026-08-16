import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { VisitsController } from "./visits.controller";
import { VisitsService } from "./visits.service";

@Module({
  imports: [WorkflowModule, AuthModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
