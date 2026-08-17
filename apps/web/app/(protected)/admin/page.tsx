"use client";

import Link from "next/link";
import type { RequestState } from "@proyecto/shared-types";
import { ADMIN_NAV } from "../../../components/admin/nav";
import { AppHeader } from "../../../components/ui/AppHeader";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAdminMetrics } from "../../../lib/hooks/use-admin";
import { useRequireAdminRole } from "../../../lib/hooks/use-require-admin-role";

// Orden de lectura: primero lo que espera accion, al final lo cerrado.
const STATE_ORDER: RequestState[] = [
  "WAITING_VOLUNTEER",
  "ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "VERIFICATION_PENDING",
  "NOTE_PENDING",
  "REASSIGNMENT_REQUIRED",
  "REQUESTED",
  "COMPLETED",
  "CANCELLED",
];

export default function AdminHomePage() {
  const isAdmin = useRequireAdminRole();
  const { data: metrics, isLoading, isError } = useAdminMetrics();

  if (!isAdmin) {
    return <Spinner label="Verificando permisos..." />;
  }

  const pending = metrics?.volunteers_by_verification.PENDING ?? 0;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Resumen
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Estado general de la plataforma.
        </p>

        {isLoading && <Spinner label="Cargando métricas..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar las métricas.
          </p>
        )}

        {metrics && (
          <>
            {pending > 0 && (
              <Link href="/admin/analistas?estado=PENDING">
                <Card className="mb-6 border-amber-300 bg-amber-50 transition-shadow hover:shadow-md">
                  <p className="font-medium text-amber-900">
                    {pending} {pending === 1 ? "analista espera" : "analistas esperan"} revisión
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Pueden operar mientras tanto, pero el ciudadano no ve el
                    distintivo de verificado. Toca para revisarlos.
                  </p>
                </Card>
              </Link>
            )}

            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Solicitudes" value={metrics.requests_total} />
              <Stat label="Analistas activos" value={metrics.volunteers_active} />
              <Stat
                label="Verificados"
                value={metrics.volunteers_by_verification.VERIFIED ?? 0}
              />
              <Stat
                label="Usuarios suspendidos"
                value={metrics.users_suspended}
                tone={metrics.users_suspended > 0 ? "warn" : "normal"}
              />
            </div>

            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sand-500">
                Solicitudes por estado
              </h2>
              <div className="flex flex-col gap-2">
                {STATE_ORDER.filter(
                  (state) => (metrics.requests_by_state[state] ?? 0) > 0,
                ).map((state) => (
                  <Link key={state} href={`/admin/solicitudes?estado=${state}`}>
                    <div className="flex items-center justify-between gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-sand-100">
                      <StatusBadge state={state} />
                      <span className="text-lg font-semibold text-sand-900">
                        {metrics.requests_by_state[state]}
                      </span>
                    </div>
                  </Link>
                ))}
                {metrics.requests_total === 0 && (
                  <p className="text-sm text-sand-500">
                    Todavía no hay solicitudes registradas.
                  </p>
                )}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <p
        className={`text-3xl font-semibold ${
          tone === "warn" ? "text-amber-700" : "text-sand-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-sand-500">{label}</p>
    </div>
  );
}
