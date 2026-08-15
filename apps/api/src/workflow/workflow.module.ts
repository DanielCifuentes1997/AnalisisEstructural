import { Module } from "@nestjs/common";
import { RequestStateMachine } from "./request-state-machine.service";

@Module({
  providers: [RequestStateMachine],
  exports: [RequestStateMachine],
})
export class WorkflowModule {}
