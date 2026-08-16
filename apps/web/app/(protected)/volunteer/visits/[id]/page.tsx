"use client";

import { useParams, useRouter } from "next/navigation";
import type { HousingType } from "@proyecto/shared-types";
import { CheckinStep } from "../../../../../components/volunteer/visit/CheckinStep";
import { NoteStep } from "../../../../../components/volunteer/visit/NoteStep";
import { PinStep } from "../../../../../components/volunteer/visit/PinStep";
import { Card } from "../../../../../components/ui/Card";
import { Spinner } from "../../../../../components/ui/Spinner";
import { ApiError } from "../../../../../lib/api-client";
import { useAuthStore } from "../../../../../lib/auth-store";
import { useRequireVolunteerRole } from "../../../../../lib/hooks/use-require-volunteer-role";
import {
  useCheckinVisit,
  useSubmitVisitNote,
  useVerifyVisitPin,
  useVisitDetail,
} from "../../../../../lib/hooks/use-visit";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

export default function VolunteerVisitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isVolunteer = useRequireVolunteerRole();
  const clearSession = useAuthStore((state) => state.clearSession);

  const { data: visit, isLoading, isError } = useVisitDetail(params.id);
  const checkin = useCheckinVisit(params.id);
  const verifyPin = useVerifyVisitPin(params.id);
  const submitNote = useSubmitVisitNote(params.id);

  if (!isVolunteer) {
    return <Spinner label="Verificando perfil de voluntario..." />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/volunteer/map")}
          className="min-h-12 text-sm text-gray-500 underline"
        >
          ← Volver al mapa
        </button>
        <button
          onClick={clearSession}
          className="min-h-12 text-sm text-gray-500 underline"
        >
          Cerrar sesion
        </button>
      </div>

      {isLoading && <Spinner label="Cargando visita..." />}
      {isError && (
        <p className="text-center text-red-600">No pudimos cargar esta visita.</p>
      )}

      {visit && (
        <>
          <Card className="mb-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {HOUSING_TYPE_LABELS[visit.housing_type]}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{visit.reporter_name}</p>
            <p className="text-sm text-gray-500">{visit.address_text}</p>
            <p className="mt-1 text-sm text-gray-500">{visit.citizen_phone}</p>
          </Card>

          {(visit.state === "ASSIGNED" ||
            visit.state === "SCHEDULED" ||
            visit.state === "IN_PROGRESS") && (
            <CheckinStep
              isLoading={checkin.isPending}
              errorMessage={
                checkin.error instanceof ApiError ? checkin.error.message : undefined
              }
              onCheckin={(latitude, longitude) =>
                checkin.mutate({ latitude, longitude })
              }
            />
          )}

          {visit.state === "VERIFICATION_PENDING" && (
            <PinStep
              isLoading={verifyPin.isPending}
              errorMessage={
                verifyPin.error instanceof ApiError
                  ? verifyPin.error.message
                  : undefined
              }
              onSubmit={(pin) => verifyPin.mutate({ pin })}
            />
          )}

          {visit.state === "NOTE_PENDING" && (
            <NoteStep
              isLoading={submitNote.isPending}
              errorMessage={
                submitNote.error instanceof ApiError
                  ? submitNote.error.message
                  : undefined
              }
              onSubmit={(zones, generalComments) =>
                submitNote.mutate({
                  zones,
                  general_comments: generalComments || undefined,
                })
              }
            />
          )}

          {visit.state === "COMPLETED" && (
            <Card>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                Visita completada
              </h2>
              <p className="text-sm text-gray-600">
                Gracias por tu acompañamiento. El ciudadano ya puede ver tu
                nota en su panel.
              </p>
            </Card>
          )}

          {(visit.state === "CANCELLED" ||
            visit.state === "REASSIGNMENT_REQUIRED") && (
            <Card>
              <p className="text-sm text-gray-600">
                Esta visita ya no esta activa (estado: {visit.state}).
              </p>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
