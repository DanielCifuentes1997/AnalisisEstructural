import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  adminRequestActionSchema,
  adminRequestsQuerySchema,
  adminVolunteersQuerySchema,
  createAdminNoticeSchema,
  reviewVolunteerSchema,
  updateUserStatusSchema,
  type AdminRequestActionInput,
  type AdminRequestsQuery,
  type AdminVolunteersQuery,
  type CreateAdminNoticeInput,
  type ReviewVolunteerInput,
  type UpdateUserStatusInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminService } from "./admin.service";

@Controller("v1/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("metrics")
  metrics() {
    return this.adminService.getMetrics();
  }

  @Get("volunteers")
  listVolunteers(
    @Query(new ZodValidationPipe(adminVolunteersQuerySchema))
    query: AdminVolunteersQuery,
  ) {
    return this.adminService.listVolunteers(query);
  }

  @Patch("volunteers/:id")
  reviewVolunteer(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reviewVolunteerSchema))
    body: ReviewVolunteerInput,
  ) {
    return this.adminService.reviewVolunteer(user.sub, id, body);
  }

  @Post("volunteers/:id/notices")
  @HttpCode(201)
  createNotice(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createAdminNoticeSchema))
    body: CreateAdminNoticeInput,
  ) {
    return this.adminService.createNotice(user.sub, id, body);
  }

  @Get("conversations")
  listConversations() {
    return this.adminService.listConversations();
  }

  @Get("conversations/:id")
  conversation(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.getConversation(id);
  }

  @Get("requests")
  listRequests(
    @Query(new ZodValidationPipe(adminRequestsQuerySchema))
    query: AdminRequestsQuery,
  ) {
    return this.adminService.listRequests(query);
  }

  @Post("requests/:id/return-to-pool")
  @HttpCode(200)
  returnToPool(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(adminRequestActionSchema))
    body: AdminRequestActionInput,
  ) {
    return this.adminService.returnRequestToPool(user.sub, id, body);
  }

  @Post("requests/:id/cancel")
  @HttpCode(200)
  cancelRequest(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(adminRequestActionSchema))
    body: AdminRequestActionInput,
  ) {
    return this.adminService.cancelRequest(user.sub, id, body);
  }

  @Patch("users/:id/status")
  updateUserStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    body: UpdateUserStatusInput,
  ) {
    return this.adminService.updateUserStatus(user.sub, id, body);
  }

  @Get("audit-logs")
  auditLogs() {
    return this.adminService.listAuditLogs();
  }
}
