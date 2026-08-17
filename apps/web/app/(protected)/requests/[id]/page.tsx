"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { HousingType, ZoneStatus } from "@proyecto/shared-types";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Spinner } from "../../../../components/ui/Spinner";
import { ApiError } from "../../../../lib/api-client";
import { damageLabel } from "../../../../lib/damage-labels";
import {
  useCancelRequest,
  useRequestDetail,
} from "../../../../lib/hooks/use-requests";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

const ZONE_STATUS_LABELS: Record<ZoneStatus, string> = {
  SAFE: "Se ve bien",
  CAUTION: "Con precaucion",
  DANGEROUS: "Evita esta zona",
};

const ZONE_STATUS_STYLES: Record<ZoneStatus, string> = {
  SAFE: "bg-emerald-100 text-emerald-800",
  CAUTION: "bg-amber-100 text-amber-800",
  DANGEROUS: "bg-red-100 text-red-800",
};

const CANCELLABLE_STATES = [
  "REQUESTED",
  "WAITING_VOLUNTEER",
  "ASSIGNED",
  "SCHEDULED",
];

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, isError } = useRequestDetail(params.id);
  const cancelRequest = useCancelRequest(params.id);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const photoUrls = request?.damages_json?.photo_urls ?? [];
  const canCancel = request && CANCELLABLE_STATES.includes(request.state);
  const cancelError =
    cancelRequest.error instanceof ApiError
      ? cancelRequest.error.message
      : undefined;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Panel de afectado" homeHref="/dashboard" />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 text-sm text-sand-500 underline hover:text-sand-900"
        >
          ← Volver a mis solicitudes
        </button>

        {isLoading && <Spinner label="Cargando solicitud..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar esta solicitud.
          </p>
        )}

        {request && (
          <div className="flex flex-col gap-4">
            {/* El PIN es lo unico que importa mientras el analista espera
                en la puerta, asi que va de primero y bien grande. */}
            {request.verification_pin && (
              <Card className="border-amber-300 bg-amber-50">
                <h2 className="text-sm font-semibold text-amber-900">
                  Tu analista ya llegó
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  Dile este código en persona para confirmar que es quien dice
                  ser. No lo compartas por teléfono ni por mensaje.
                </p>
                <p className="mt-4 text-center font-mono text-4xl font-bold tracking-[0.3em] text-amber-900">
                  {request.verification_pin}
                </p>
              </Card>
            )}

            {request.assigned_volunteer && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-sand-500">
                  Quien viene a acompañarte
                </h2>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage */}
                  <img
                    src={request.assigned_volunteer.photo_url}
                    alt={request.assigned_volunteer.full_name}
                    className="h-16 w-16 rounded-full border border-sand-200 object-cover"
                  />
                  <div>
                    <p className="text-lg font-semibold text-sand-900">
                      {request.assigned_volunteer.full_name}
                    </p>
                    <a
                      href={`tel:${request.assigned_volunteer.phone_number}`}
                      className="text-sm font-medium text-brand-700 underline"
                    >
                      {request.assigned_volunteer.phone_number}
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {request.visit_note && (
              <Card className="border-brand-200 bg-brand-50">
                <h2 className="mb-1 text-sm font-semibold text-brand-900">
                  Nota de la visita
                </h2>
                <p className="mb-4 text-xs text-brand-800">
                  Observaciones informales de tu analista, no un dictamen
                  oficial.
                </p>

                <div className="flex flex-col gap-2">
                  {request.visit_note.zones.map((zone, index) => (
                    <div
                      key={`${zone.zone_name}-${index}`}
                      className="rounded-xl border border-brand-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sand-900">
                          {zone.zone_name}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${ZONE_STATUS_STYLES[zone.status]}`}
                        >
                          {ZONE_STATUS_LABELS[zone.status]}
                        </span>
                      </div>
                      {zone.comment && (
                        <p className="mt-2 text-sm text-sand-600">
                          {zone.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {request.visit_note.general_comments && (
                  <p className="mt-4 text-sm text-sand-700">
                    {request.visit_note.general_comments}
                  </p>
                )}
              </Card>
            )}

            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold text-sand-900">
                  {HOUSING_TYPE_LABELS[request.housing_type]}
                </h1>
                <StatusBadge state={request.state} />
              </div>

              <dl className="flex flex-col gap-3 text-sm">
                <Row label="Reportada el">
                  {new Date(request.created_at).toLocaleString("es-CO")}
                </Row>
                <Row label="Nombre">{request.reporter_name}</Row>
                <Row label="Direccion">{request.address_text}</Row>
                {request.address_complement && (
                  <Row label="Complemento">{request.address_complement}</Row>
                )}
                {request.damages_json.selected?.length > 0 && (
                  <Row label="Daños reportados">
                    {request.damages_json.selected.map(damageLabel).join(", ")}
                  </Row>
                )}
                {request.damages_json.otros_detalle && (
                  <Row label="Otros">{request.damages_json.otros_detalle}</Row>
                )}
                <div className="flex flex-col gap-1 border-t border-sand-100 pt-3">
                  <dt className="text-sand-500">Descripcion</dt>
                  <dd className="text-sand-900">
                    {request.damages_json.description}
                  </dd>
                </div>
              </dl>

              {photoUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage
                    <img
                      key={url}
                      src={url}
                      alt="Foto del daño"
                      className="h-24 w-full rounded-xl border border-sand-200 object-cover"
                    />
                  ))}
                </div>
              )}

              <p className="mt-6 border-t border-sand-100 pt-4 text-sm text-sand-500">
                Este es un canal de acompañamiento comunitario informal, no un
                dictamen oficial. Un analista voluntario te acompañará mientras
                llega la autoridad competente.
              </p>
            </Card>

            {canCancel && (
              <Card>
                {!confirmingCancel ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-sand-600">
                      ¿Ya no necesitas esta visita?
                    </p>
                    <Button
                      variant="danger"
                      onClick={() => setConfirmingCancel(true)}
                    >
                      Cancelar solicitud
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-sand-900">
                      ¿Seguro que quieres cancelar? No se puede deshacer.
                    </p>
                    {cancelError && (
                      <p className="text-sm text-red-600">{cancelError}</p>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmingCancel(false)}
                      >
                        No, mantenerla
                      </Button>
                      <Button
                        variant="danger"
                        isLoading={cancelRequest.isPending}
                        onClick={() => cancelRequest.mutate()}
                      >
                        Si, cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-sand-100 pt-3 first:border-0 first:pt-0">
      <dt className="shrink-0 text-sand-500">{label}</dt>
      <dd className="text-right text-sand-900">{children}</dd>
    </div>
  );
}
