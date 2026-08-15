import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { RequestOtpInput, VerifyOtpInput } from "@proyecto/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { OTP_PROVIDER, type OtpProvider } from "./otp/otp-provider.interface";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

@Injectable()
export class AuthService {
  constructor(
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<void> {
    await this.otpProvider.sendOtp(input.phone_number);
  }

  async verifyOtp(input: VerifyOtpInput) {
    const isValid = await this.otpProvider.verifyOtp(
      input.phone_number,
      input.otp_code,
    );

    if (!isValid) {
      throw new UnauthorizedException("Codigo OTP invalido o expirado");
    }

    const user = await this.prisma.users.upsert({
      where: { phone_number: input.phone_number },
      update: {},
      create: { phone_number: input.phone_number },
    });

    if (user.status === "SUSPENDED") {
      throw new ForbiddenException("Esta cuenta ha sido suspendida");
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: "refresh" },
      { expiresIn: REFRESH_TOKEN_TTL },
    );

    return { user, accessToken, refreshToken };
  }
}
