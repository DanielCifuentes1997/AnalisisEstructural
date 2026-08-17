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
  reportAbuseSchema,
  sendMessageSchema,
  type ReportAbuseInput,
  type SendMessageInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ChatService } from "./chat.service";

// Sin @Roles: aqui entran las dos partes de la conversacion, y el
// servicio verifica que quien llama sea una de ellas.
@Controller("v1")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("messages/unread")
  unread(@CurrentUser() user: AccessTokenPayload) {
    return this.chatService.getUnreadSummary(user.sub);
  }

  @Get("visits/:id/messages")
  conversation(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getConversation(user.sub, id);
  }

  @Post("visits/:id/report")
  report(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reportAbuseSchema)) body: ReportAbuseInput,
  ) {
    return this.chatService.reportAbuse(user.sub, id, body);
  }

  @Post("visits/:id/messages")
  send(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    return this.chatService.sendMessage(user.sub, id, body);
  }
}
