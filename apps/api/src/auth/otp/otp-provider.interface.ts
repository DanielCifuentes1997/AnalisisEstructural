export const OTP_PROVIDER = "OTP_PROVIDER";

export interface OtpProvider {
  sendOtp(phoneNumber: string): Promise<void>;
  verifyOtp(phoneNumber: string, code: string): Promise<boolean>;
}
