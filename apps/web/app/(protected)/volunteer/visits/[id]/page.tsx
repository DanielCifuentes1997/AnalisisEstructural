"use client";

import { useParams, useRouter } from "next/navigation";
import type { HousingType } from "@proyecto/shared-types";
import { CheckinStep } from "../../../../../components/volunteer/visit/CheckinStep";
import { NoteStep } from "../../../../../components/volunteer/visit/NoteStep";
import { PinStep } from "../../../../../components/volunteer/visit/PinStep";
import { AppHeader } from "../../../../../components/ui/AppHeader";
import { Card } from "../../../../../components/ui/Card";
import { Spinner } from "../../../../../components/ui/Spinner";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { VOLUNTEER_NAV } from "../../../../../components/volunteer/nav";
import { ApiError } from "../../../../../lib/api-client";
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

  const { data: visit, isLoading, isError } = useVisitDetail(params.id);
  const checkin = useCheckinVisit(params.id);
  const verifyPin = useVerifyVisitPin(params.id);
  const submitNote = useSubmitVisitNote(params.id);

  if (!isVolunteer) {
    return <Spinner label="Verificando perfil de voluntario..." />;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader
        subtitle="Panel de analista"
        homeHref="/volunteer"
        nav={VOLUNTEER_NAV}
      />

      <main className="mx-auto max-w-sm px-4 py-8">
        <button
          onClick={() => router.push("/volunteer")}
          className="mb-4 text-sm text-sand-500 underline hover:text-sand-900"
        >
          ← Volver a mis visitas
        </button>

      {isLoading && <Spinner label="Cargando visita..." />}
      {isError && (
        <p className="text-center text-red-600">No pudimos cargar esta visita.</p>
      )}

      {visit && (
        <>
          <Card className="mb-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h1 className="text-lg font-semibold text-sand-900">
                {visit.reporter_name}
              </h1>
              <StatusBadge state={visit.state} />
            </div>
            <p className="text-sm text-sand-600">{visit.address_text}</p>
            <p className="text-sm text-sand-500">
              {HOUSING_TYPE_LABELS[visit.housing_type]}
            </p>
            <a
              href={`tel:${visit.citizen_phone}`}
              className="mt-2 inline-block text-sm font-medium text-brand-700 underline"
            >
              {visit.citizen_phone}
            </a>
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
            <Card className="border-brand-200 bg-brand-50">
              <h2 className="mb-2 text-lg font-semibold text-brand-900">
                Visita completada
              </h2>
              <p className="text-sm text-brand-800">
                Gracias por tu acompañamiento. La persona ya puede ver tu nota
                en su panel.
              </p>
            </Card>
          )}

          {(visit.state === "CANCELLED" ||
            visit.state === "REASSIGNMENT_REQUIRED") && (
            <Card>
              <p className="text-sm text-sand-600">
                Esta visita ya no está activa.
              </p>
            </Card>
          )}
        </>
      )}
      </main>
    </div>
  );
}
