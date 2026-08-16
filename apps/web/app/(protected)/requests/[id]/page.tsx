"use client";

import { useParams, useRouter } from "next/navigation";
import type { HousingType } from "@proyecto/shared-types";
import { Card } from "../../../../components/ui/Card";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Spinner } from "../../../../components/ui/Spinner";
import { damageLabel } from "../../../../lib/damage-labels";
import { useRequestDetail } from "../../../../lib/hooks/use-requests";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, isError } = useRequestDetail(params.id);

  const photoUrls = request?.damages_json?.photo_urls ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 min-h-12 text-sm text-gray-500 underline"
      >
        ← Volver
      </button>

      {isLoading && <Spinner label="Cargando solicitud..." />}
      {isError && (
        <p className="text-center text-red-600">
          No pudimos cargar esta solicitud.
        </p>
      )}

      {request && (
        <div className="flex flex-col gap-4">
          {request.assigned_volunteer && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                Quien viene a acompañarte
              </h2>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage */}
                <img
                  src={request.assigned_volunteer.photo_url}
                  alt={request.assigned_volunteer.full_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {request.assigned_volunteer.full_name}
                  </p>
                  <a
                    href={`tel:${request.assigned_volunteer.phone_number}`}
                    className="text-sm text-blue-600 underline"
                  >
                    {request.assigned_volunteer.phone_number}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">
                {HOUSING_TYPE_LABELS[request.housing_type]}
              </h1>
              <StatusBadge state={request.state} />
            </div>

            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Reportada el</dt>
                <dd className="text-gray-900">
                  {new Date(request.created_at).toLocaleString("es-CO")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Nombre</dt>
                <dd className="text-gray-900">{request.reporter_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Direccion</dt>
                <dd className="text-right text-gray-900">{request.address_text}</dd>
              </div>
              {request.damages_json.selected?.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Daños reportados</dt>
                  <dd className="text-right text-gray-900">
                    {request.damages_json.selected.map(damageLabel).join(", ")}
                  </dd>
                </div>
              )}
              {request.damages_json.otros_detalle && (
                <div className="flex flex-col gap-1">
                  <dt className="text-gray-500">Otros</dt>
                  <dd className="text-gray-900">{request.damages_json.otros_detalle}</dd>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <dt className="text-gray-500">Descripcion</dt>
                <dd className="text-gray-900">{request.damages_json.description}</dd>
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
                    className="h-24 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <p className="mt-6 text-sm text-gray-500">
              Este es un canal de acompañamiento comunitario informal, no un
              dictamen oficial. Un voluntario te contactará mientras llega la
              autoridad competente.
            </p>
          </Card>
        </div>
      )}
    </main>
  );
}
