"use client";

import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../components/ui/Card";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Spinner } from "../../../../components/ui/Spinner";
import { useRequestDetail } from "../../../../lib/hooks/use-requests";

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, isError } = useRequestDetail(params.id);

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
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {request.structural_type}
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
            {Object.entries(request.damages_json)
              .filter(([key]) => key !== "photo_urls")
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-gray-500">{key}</dt>
                  <dd className="text-gray-900">{String(value)}</dd>
                </div>
              ))}
          </dl>

          <p className="mt-6 text-sm text-gray-500">
            Este es un canal de acompañamiento comunitario informal, no un
            dictamen oficial. Un voluntario te contactará mientras llega la
            autoridad competente.
          </p>
        </Card>
      )}
    </main>
  );
}
