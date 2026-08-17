import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  acceptDataPolicySchema,
  DATA_POLICY_VERSION,
  type AcceptDataPolicyInput,
} from "@proyecto/shared-types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AccessTokenPayload } from "./types/jwt-payload.interface";

/**
 * Habeas data (Ley 1581 de 2012 y Decreto 1377 de 2013): la autorizacion
 * del titular debe ser previa, expresa e informada, y el responsable
 * tiene que poder probar que la obtuvo. Por eso se guarda la fecha y la
 * version de la politica aceptada, no un simple booleano: si la politica
 * cambia, se sube la version y se vuelve a pedir.
 */
@Controller("v1/consent")
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async status(@CurrentUser() user: AccessTokenPayload) {
    const found = await this.prisma.users.findUnique({
      where: { id: user.sub },
      select: { data_consent_at: true, data_consent_version: true },
    });

    return {
      current_version: DATA_POLICY_VERSION,
      accepted_version: found?.data_consent_version ?? null,
      accepted_at: found?.data_consent_at ?? null,
      needs_acceptance: found?.data_consent_version !== DATA_POLICY_VERSION,
    };
  }

  @Post()
  async accept(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(acceptDataPolicySchema))
    body: AcceptDataPolicyInput,
  ) {
    await this.prisma.users.update({
      where: { id: user.sub },
      data: {
        data_consent_at: new Date(),
        data_consent_version: body.version,
      },
    });

    return { accepted_version: body.version };
  }
}
