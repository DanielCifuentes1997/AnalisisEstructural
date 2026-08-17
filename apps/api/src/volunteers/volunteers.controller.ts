import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import {
  registerVolunteerSchema,
  updateVolunteerProfileSchema,
  type RegisterVolunteerInput,
  type UpdateVolunteerProfileInput,
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

  @Get("me")
  getMyProfile(@CurrentUser() user: AccessTokenPayload) {
    return this.volunteersService.getMyProfile(user.sub);
  }

  @Patch("me")
  updateMyProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(updateVolunteerProfileSchema))
    body: UpdateVolunteerProfileInput,
  ) {
    return this.volunteersService.updateMyProfile(user.sub, body);
  }

  @Post()
  register(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(registerVolunteerSchema))
    body: RegisterVolunteerInput,
  ) {
    return this.volunteersService.register(user.sub, body);
  }
}
