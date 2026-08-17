import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  checkinSchema,
  releaseVisitSchema,
  submitVisitNoteSchema,
  verifyPinSchema,
  type CheckinInput,
  type ReleaseVisitInput,
  type SubmitVisitNoteInput,
  type VerifyPinInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitsService } from "./visits.service";

@Controller("v1/visits")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("VOLUNTEER")
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.visitsService.listMyVisits(user.sub);
  }

  @Get(":id")
  getDetail(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.visitsService.getVisitDetail(user.sub, id);
  }

  @Post(":id/checkin")
  checkin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(checkinSchema)) body: CheckinInput,
  ) {
    return this.visitsService.checkin(user.sub, id, body);
  }

  @Post(":id/verify-pin")
  verifyPin(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(verifyPinSchema)) body: VerifyPinInput,
  ) {
    return this.visitsService.verifyPin(user.sub, id, body);
  }

  @Post(":id/release")
  release(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(releaseVisitSchema)) body: ReleaseVisitInput,
  ) {
    return this.visitsService.releaseVisit(user.sub, id, body);
  }

  @Post(":id/note")
  submitNote(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(submitVisitNoteSchema))
    body: SubmitVisitNoteInput,
  ) {
    return this.visitsService.submitNote(user.sub, id, body);
  }
}
