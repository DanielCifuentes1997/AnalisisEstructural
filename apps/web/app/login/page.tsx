"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpStep } from "../../components/auth/OtpStep";
import { PhoneStep } from "../../components/auth/PhoneStep";
import { Card } from "../../components/ui/Card";
import { LogoLockup } from "../../components/ui/Logo";
import { Spinner } from "../../components/ui/Spinner";
import { ApiError } from "../../lib/api-client";
import { useRequestOtp, useVerifyOtp } from "../../lib/hooks/use-auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsToBeAnalyst = searchParams.get("rol") === "analista";
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
      {
        onSuccess: (data) => {
          if (data.user.role === "VOLUNTEER") {
            router.push("/volunteer");
            return;
          }
          // Quien entro por la puerta de "analista" y todavia no tiene
          // perfil va directo al registro, no al panel de afectado.
          router.push(wantsToBeAnalyst ? "/volunteer/register" : "/dashboard");
        },
      },
    );
  };

  const requestOtpError =
    requestOtp.error instanceof ApiError ? requestOtp.error.message : undefined;
  const verifyOtpError =
    verifyOtp.error instanceof ApiError ? verifyOtp.error.message : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sand-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoLockup
            subtitle={
              wantsToBeAnalyst ? "Ingreso de analistas" : "Ingreso de afectados"
            }
          />
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-sand-900">
          {wantsToBeAnalyst ? "Ingresa para ayudar" : "Ingresa a tu cuenta"}
        </h1>
        <p className="mb-6 text-center text-sm text-sand-600">
          Te enviamos un código por mensaje de texto. No necesitas contraseña.
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

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-sand-500 underline hover:text-sand-900">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginContent />
    </Suspense>
  );
}
