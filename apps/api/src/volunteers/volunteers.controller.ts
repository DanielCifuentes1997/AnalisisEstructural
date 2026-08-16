import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  registerVolunteerSchema,
  type RegisterVolunteerInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VolunteersService } from "./volunteers.service";

@Controller("v1/volunteers")
@UseGuards(JwtAuthGuard)
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Post()
  register(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(registerVolunteerSchema))
    body: RegisterVolunteerInput,
  ) {
    return this.volunteersService.register(user.sub, body);
  }
}
