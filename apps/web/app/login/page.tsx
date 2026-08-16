"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OtpStep } from "../../components/auth/OtpStep";
import { PhoneStep } from "../../components/auth/PhoneStep";
import { Card } from "../../components/ui/Card";
import { ApiError } from "../../lib/api-client";
import { useRequestOtp, useVerifyOtp } from "../../lib/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const [phoneE164, setPhoneE164] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const handlePhoneSubmit = (phone: string) => {
    requestOtp.mutate(
      { phone_number: phone },
      { onSuccess: () => setPhoneE164(phone) },
    );
  };

  const handleOtpSubmit = (code: string) => {
    if (!phoneE164) return;
    verifyOtp.mutate(
      { phone_number: phoneE164, otp_code: code },
      { onSuccess: () => router.push("/dashboard") },
    );
  };

  const requestOtpError =
    requestOtp.error instanceof ApiError ? requestOtp.error.message : undefined;
  const verifyOtpError =
    verifyOtp.error instanceof ApiError ? verifyOtp.error.message : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Acompañamiento Comunitario
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Ingresa tu numero para reportar tu vivienda o ver tus solicitudes.
        </p>
        <Card>
          {!phoneE164 ? (
            <PhoneStep
              onSubmit={handlePhoneSubmit}
              isLoading={requestOtp.isPending}
              errorMessage={requestOtpError}
            />
          ) : (
            <OtpStep
              phoneE164={phoneE164}
              onSubmit={handleOtpSubmit}
              onBack={() => setPhoneE164(null)}
              isLoading={verifyOtp.isPending}
              errorMessage={verifyOtpError}
            />
          )}
        </Card>
      </div>
    </main>
  );
}
