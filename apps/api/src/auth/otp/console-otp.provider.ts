import { Injectable, Logger } from "@nestjs/common";
import type { OtpProvider } from "./otp-provider.interface";

interface PendingOtp {
  code: string;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * Proveedor de desarrollo: no envia SMS real, imprime el codigo en consola.
 * Se activa automaticamente cuando las credenciales de Twilio no estan
 * configuradas (ver otp.module.ts), para no bloquear el desarrollo local.
 */
@Injectable()
export class ConsoleOtpProvider implements OtpProvider {
  private readonly logger = new Logger(ConsoleOtpProvider.name);
  private readonly pending = new Map<string, PendingOtp>();

  sendOtp(phoneNumber: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pending.set(phoneNumber, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    this.logger.warn(
      `[DEV OTP] Codigo para ${phoneNumber}: ${code} (Twilio no configurado)`,
    );
    return Promise.resolve();
  }

  verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const entry = this.pending.get(phoneNumber);
    if (!entry || Date.now() > entry.expiresAt) {
      this.pending.delete(phoneNumber);
      return Promise.resolve(false);
    }

    const isValid = entry.code === code;
    if (isValid) this.pending.delete(phoneNumber);
    return Promise.resolve(isValid);
  }
}
