import { z } from "zod";

// Celular colombiano en formato E.164: +57 seguido de 10 digitos, iniciando en 3.
const COLOMBIAN_MOBILE_REGEX = /^\+573\d{9}$/;

export const phoneNumberSchema = z
  .string()
  .regex(
    COLOMBIAN_MOBILE_REGEX,
    "Numero celular invalido. Formato esperado: +573XXXXXXXXX",
  );

export const requestOtpSchema = z.object({
  phone_number: phoneNumberSchema,
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = requestOtpSchema.extend({
  otp_code: z
    .string()
    .regex(/^\d{6}$/, "El codigo OTP debe tener exactamente 6 digitos"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// Renovacion de sesion: el access token es corto, pero el refresh dura
// semanas para que nadie pierda la sesion en medio de un reporte.
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(10, "Refresh token invalido"),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
