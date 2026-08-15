import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  requestOtpSchema,
  verifyOtpSchema,
  type RequestOtpInput,
  type VerifyOtpInput,
} from "@proyecto/shared-types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("request-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) body: RequestOtpInput,
  ) {
    await this.authService.requestOtp(body);
    return { message: "Codigo enviado" };
  }

  @Post("verify-otp")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtpInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.verifyOtp(body);

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
      },
    };
  }
}
