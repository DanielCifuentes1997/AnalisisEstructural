"use client";

import { useRouter } from "next/navigation";
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
    <main className="mx-auto min-h-screen max-w-sm px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Registro de voluntario
      </h1>
      <Card>
        <RegisterForm
          isLoading={registerVolunteer.isPending}
          errorMessage={errorMessage}
          onSubmit={(input) =>
            registerVolunteer.mutate(input, {
              onSuccess: () => router.push("/volunteer/map"),
            })
          }
        />
      </Card>
    </main>
  );
}
