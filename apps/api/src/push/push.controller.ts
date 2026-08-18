import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  pushSubscriptionSchema,
  unsubscribePushSchema,
  type PushSubscriptionInput,
  type UnsubscribePushInput,
} from "@proyecto/shared-types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.interface";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PushService } from "./push.service";

@Controller("v1/push")
export class PushController {
  constructor(private readonly pushService: PushService) {}

  // Sin guard: la llave publica es publica por definicion, y el
  // navegador la necesita antes de que el usuario acepte nada.
  @Get("public-key")
  publicKey() {
    return this.pushService.getPublicKey();
  }

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  subscribe(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(pushSubscriptionSchema))
    body: PushSubscriptionInput,
  ) {
    return this.pushService.subscribe(user.sub, body);
  }

  @Delete("subscribe")
  @UseGuards(JwtAuthGuard)
  unsubscribe(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(unsubscribePushSchema))
    body: UnsubscribePushInput,
  ) {
    return this.pushService.unsubscribe(user.sub, body.endpoint);
  }
}
