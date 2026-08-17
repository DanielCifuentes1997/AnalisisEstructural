import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  createPropertyRequestSchema,
  heatmapQuerySchema,
  type CreatePropertyRequestInput,
  type HeatmapQuery,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitsService } from "../visits/visits.service";
import { RequestsService } from "./requests.service";

@Controller("v1/requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly visitsService: VisitsService,
  ) {}

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

  @Get("heatmap")
  @Roles("VOLUNTEER")
  heatmap(
    @Query(new ZodValidationPipe(heatmapQuerySchema)) query: HeatmapQuery,
  ) {
    return this.requestsService.getHeatmap(query.bbox);
  }

  // Debe ir despues de "heatmap": si estuviera antes, Nest interpretaria
  // GET /v1/requests/heatmap como si "heatmap" fuera el :id.
  @Get(":id")
  @Roles("CITIZEN")
  findOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requestsService.findOneForCitizen(user.sub, id);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @Roles("CITIZEN")
  cancel(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requestsService.cancelForCitizen(user.sub, id);
  }

  @Post(":id/accept")
  @Roles("VOLUNTEER")
  accept(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.visitsService.acceptRequest(user.sub, id);
  }
}
