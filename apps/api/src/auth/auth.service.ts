import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Users } from "@proyecto/database";
import type {
  RefreshTokenInput,
  RequestOtpInput,
  VerifyOtpInput,
} from "@proyecto/shared-types";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { OTP_PROVIDER, type OtpProvider } from "./otp/otp-provider.interface";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./types/jwt-payload.interface";

// Sesion larga a proposito: la gente reporta desde la calle, con mala
// senal y bateria baja. Un access token de 15m los sacaba a mitad del
// formulario. 24h + refresh de 30d evita que pierdan el trabajo.
const ACCESS_TOKEN_TTL = "24h";
const REFRESH_TOKEN_TTL = "30d";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<void> {
    await this.otpProvider.sendOtp(input.phone_number);
  }

  /**
   * ADMIN_PHONES resuelve el problema del huevo y la gallina: sin esto
   * nadie podria ser el primer administrador. Es una puerta permanente,
   * asi que cada promocion queda escrita en la bitacora para que se
   * pueda auditar quien entro por ahi y cuando.
   */
  private async promoteIfConfiguredAdmin(user: Users): Promise<Users> {
    const configured = (process.env.ADMIN_PHONES ?? "")
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean);

    if (!configured.includes(user.phone_number) || user.role === "ADMIN") {
      return user;
    }

    const promoted = await this.prisma.users.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    await this.audit.record({
      actorId: user.id,
      action: "ADMIN_PROMOTED",
      resourceId: user.id,
      priorState: user.role,
      newState: "ADMIN",
    });
    this.logger.warn(
      `Usuario ${user.id} promovido a ADMIN por estar en ADMIN_PHONES`,
    );

    return promoted;
  }

  async verifyOtp(input: VerifyOtpInput) {
    const isValid = await this.otpProvider.verifyOtp(
      input.phone_number,
      input.otp_code,
    );

    if (!isValid) {
      throw new UnauthorizedException("Codigo OTP invalido o expirado");
    }

    const upserted = await this.prisma.users.upsert({
      where: { phone_number: input.phone_number },
      update: {},
      create: { phone_number: input.phone_number },
    });

    if (upserted.status === "SUSPENDED") {
      throw new ForbiddenException("Esta cuenta ha sido suspendida");
    }

    const user = await this.promoteIfConfiguredAdmin(upserted);

    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      type: "refresh",
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { user, accessToken, refreshToken };
  }

  async refresh(input: RefreshTokenInput) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        input.refresh_token,
      );
    } catch {
      throw new UnauthorizedException("Sesion expirada, vuelve a ingresar");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Token de refresco invalido");
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException("Sesion expirada, vuelve a ingresar");
    }
    if (user.status === "SUSPENDED") {
      throw new ForbiddenException("Esta cuenta ha sido suspendida");
    }

    // El rol se relee de la base: si el usuario se registro como
    // voluntario despues de emitir el refresh, la sesion nueva ya lo
    // refleja sin obligarlo a volver a iniciar sesion.
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    return { user, accessToken };
  }
}
