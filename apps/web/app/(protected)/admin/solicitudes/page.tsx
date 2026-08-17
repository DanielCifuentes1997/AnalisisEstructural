"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HousingType, RequestState } from "@proyecto/shared-types";
import { ADMIN_NAV } from "../../../../components/admin/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { ApiError } from "../../../../lib/api-client";
import {
  useAdminCancelRequest,
  useAdminRequests,
  useReturnRequestToPool,
} from "../../../../lib/hooks/use-admin";
import { useRequireAdminRole } from "../../../../lib/hooks/use-require-admin-role";
import type { AdminRequest } from "../../../../lib/types";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

// A partir de aqui una solicitud asignada empieza a oler a abandonada.
const STALE_HOURS = 24;

function SolicitudesContent() {
  const isAdmin = useRequireAdminRole();
  const searchParams = useSearchParams();
  const initial = searchParams.get("estado") as RequestState | null;
  const [filter, setFilter] = useState<RequestState | "ALL">(initial ?? "ALL");

  const { data: requests, isLoading, isError } = useAdminRequests(
    filter === "ALL" ? undefined : filter,
  );

  if (!isAdmin) {
    return <Spinner label="Verificando permisos..." />;
  }

  const stale =
    requests?.filter(
      (r) => r.is_stuck_candidate && r.hours_since_update >= STALE_HOURS,
    ) ?? [];

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Solicitudes
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Si un analista aceptó un caso y desapareció, devuélvelo al mapa
          para que otro lo pueda tomar.
        </p>

        {stale.length > 0 && filter === "ALL" && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <p className="font-medium text-amber-900">
              {stale.length}{" "}
              {stale.length === 1
                ? "solicitud lleva"
                : "solicitudes llevan"}{" "}
              más de {STALE_HOURS}h sin avanzar
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Están asignadas pero sin movimiento. Puede que el analista ya no
              vaya a ir.
            </p>
          </Card>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {(["ALL", "WAITING_VOLUNTEER", "ASSIGNED", "COMPLETED"] as const).map(
            (option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === option
                    ? "bg-brand-700 text-white"
                    : "border border-sand-300 bg-white text-sand-700 hover:bg-sand-100"
                }`}
              >
                {option === "ALL"
                  ? "Todas"
                  : option === "WAITING_VOLUNTEER"
                    ? "Buscando analista"
                    : option === "ASSIGNED"
                      ? "Asignadas"
                      : "Completadas"}
              </button>
            ),
          )}
        </div>

        {isLoading && <Spinner label="Cargando solicitudes..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar las solicitudes.
          </p>
        )}

        {requests && requests.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-sand-600">
              No hay solicitudes en esta categoría.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {requests?.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </main>
    </div>
  );
}

function RequestCard({ request }: { request: AdminRequest }) {
  const returnToPool = useReturnRequestToPool();
  const cancelRequest = useAdminCancelRequest();
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"pool" | "cancel" | null>(null);

  const isStale = request.is_stuck_candidate && request.hours_since_update >= STALE_HOURS;
  const isClosed = request.state === "COMPLETED" || request.state === "CANCELLED";
  const error =
    returnToPool.error instanceof ApiError
      ? returnToPool.error.message
      : cancelRequest.error instanceof ApiError
        ? cancelRequest.error.message
        : undefined;

  return (
    <Card className={isStale ? "border-amber-300" : ""}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-sand-900">
            {request.reporter_name}
          </h2>
          <p className="text-sm text-sand-600">
            {request.address_text}
            {request.address_complement ? ` — ${request.address_complement}` : ""}
          </p>
          <p className="text-xs text-sand-500">
            {HOUSING_TYPE_LABELS[request.housing_type]} · {request.citizen_phone}
          </p>
        </div>
        <StatusBadge state={request.state} />
      </div>

      <p className="text-xs text-sand-500">
        Creada el {new Date(request.created_at).toLocaleDateString("es-CO")} ·
        último cambio hace {request.hours_since_update}h
        {request.assigned_volunteer_name
          ? ` · analista: ${request.assigned_volunteer_name}`
          : ""}
      </p>

      {isStale && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Lleva {request.hours_since_update}h sin avanzar. Considera devolverla
          al mapa.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!isClosed && (
        <>
          {action ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-sand-100 pt-4">
              <label className="text-sm font-medium text-sand-700">
                Motivo (queda en la bitácora)
              </label>
              <textarea
                className="min-h-20 rounded-xl border border-sand-300 px-4 py-3 text-base"
                placeholder={
                  action === "pool"
                    ? "Ej. El analista no contestó en dos días"
                    : "Ej. La persona reportó por error"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAction(null)}>
                  Cancelar
                </Button>
                <Button
                  variant={action === "cancel" ? "danger" : "primary"}
                  isLoading={returnToPool.isPending || cancelRequest.isPending}
                  onClick={() => {
                    const payload = {
                      requestId: request.id,
                      input: { reason: reason || undefined },
                    };
                    const onSuccess = () => {
                      setAction(null);
                      setReason("");
                    };
                    if (action === "pool") {
                      returnToPool.mutate(payload, { onSuccess });
                    } else {
                      cancelRequest.mutate(payload, { onSuccess });
                    }
                  }}
                >
                  {action === "pool" ? "Devolver al mapa" : "Cancelar solicitud"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-sand-100 pt-4">
              {request.is_stuck_candidate && (
                <Button onClick={() => setAction("pool")}>
                  Devolver al mapa
                </Button>
              )}
              <Button variant="danger" onClick={() => setAction("cancel")}>
                Cancelar solicitud
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SolicitudesContent />
    </Suspense>
  );
}
