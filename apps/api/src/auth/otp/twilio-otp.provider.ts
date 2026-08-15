import { Injectable } from "@nestjs/common";
import twilio from "twilio";
import type { Twilio } from "twilio";
import type { OtpProvider } from "./otp-provider.interface";

@Injectable()
export class TwilioOtpProvider implements OtpProvider {
  private readonly client: Twilio;
  private readonly verifyServiceSid: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new Error(
        "TwilioOtpProvider requiere TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_VERIFY_SERVICE_SID",
      );
    }

    this.client = twilio(accountSid, authToken);
    this.verifyServiceSid = verifyServiceSid;
  }

  async sendOtp(phoneNumber: string): Promise<void> {
    await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const result = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    return result.status === "approved";
  }
}
