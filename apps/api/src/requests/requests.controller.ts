import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import {
  createPropertyRequestSchema,
  type CreatePropertyRequestInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { RequestsService } from "./requests.service";

@Controller("v1/requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @HttpCode(201)
  @Roles("CITIZEN")
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createPropertyRequestSchema))
    body: CreatePropertyRequestInput,
  ) {
    return this.requestsService.create(user.sub, body);
  }

  @Get()
  @Roles("CITIZEN")
  findMine(@CurrentUser() user: AccessTokenPayload) {
    return this.requestsService.findAllForCitizen(user.sub);
  }
}
