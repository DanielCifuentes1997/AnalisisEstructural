import { Logger, Module } from "@nestjs/common";
import { ConsoleOtpProvider } from "./console-otp.provider";
import { TwilioOtpProvider } from "./twilio-otp.provider";
import { OTP_PROVIDER, type OtpProvider } from "./otp-provider.interface";

const logger = new Logger("OtpModule");

@Module({
  providers: [
    {
      provide: OTP_PROVIDER,
      useFactory: (): OtpProvider => {
        const hasTwilioConfig =
          !!process.env.TWILIO_ACCOUNT_SID &&
          !!process.env.TWILIO_AUTH_TOKEN &&
          !!process.env.TWILIO_VERIFY_SERVICE_SID;

        if (hasTwilioConfig) {
          logger.log("Usando TwilioOtpProvider (SMS real via Twilio Verify)");
          return new TwilioOtpProvider();
        }

        logger.warn(
          "Credenciales de Twilio ausentes: usando ConsoleOtpProvider (dev)",
        );
        return new ConsoleOtpProvider();
      },
    },
  ],
  exports: [OTP_PROVIDER],
})
export class OtpModule {}
