"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Card } from "../../../../components/ui/Card";
import { RegisterForm } from "../../../../components/volunteer/RegisterForm";
import { ApiError } from "../../../../lib/api-client";
import { useRegisterVolunteer } from "../../../../lib/hooks/use-volunteer";

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const registerVolunteer = useRegisterVolunteer();

  const errorMessage =
    registerVolunteer.error instanceof ApiError
      ? registerVolunteer.error.message
      : undefined;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Registro de analista" homeHref="/dashboard" />

      <main className="mx-auto max-w-sm px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Registro de analista
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Cuéntanos quién eres para que las personas sepan a quién le abren la
          puerta.
        </p>
        <Card>
          <RegisterForm
            isLoading={registerVolunteer.isPending}
            errorMessage={errorMessage}
            onSubmit={(input) =>
              registerVolunteer.mutate(input, {
                onSuccess: () => router.push("/volunteer"),
              })
            }
          />
        </Card>
      </main>
    </div>
  );
}
