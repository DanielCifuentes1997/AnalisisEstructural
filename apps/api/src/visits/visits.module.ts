import { Module } from "@nestjs/common";
import { WorkflowModule } from "../workflow/workflow.module";
import { VisitsService } from "./visits.service";

@Module({
  imports: [WorkflowModule],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
