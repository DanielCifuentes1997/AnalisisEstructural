import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VisitsModule } from "../visits/visits.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [AuthModule, WorkflowModule, VisitsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
