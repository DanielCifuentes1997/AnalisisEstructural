"use client";

import { ADMIN_NAV } from "../../../../components/admin/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { useAuditLogs } from "../../../../lib/hooks/use-admin";
import { useRequireAdminRole } from "../../../../lib/hooks/use-require-admin-role";

const ACTION_LABELS: Record<string, string> = {
  ADMIN_PROMOTED: "Se convirtió en administrador",
  VOLUNTEER_VERIFIED: "Verificó a un analista",
  VOLUNTEER_REJECTED: "Rechazó a un analista",
  VOLUNTEER_REVIEW_RESET: "Devolvió a revisión pendiente",
  VOLUNTEER_DEACTIVATED: "Desactivó a un analista",
  VOLUNTEER_REACTIVATED: "Reactivó a un analista",
  USER_SUSPENDED: "Suspendió una cuenta",
  USER_REACTIVATED: "Levantó una suspensión",
  REQUEST_RETURNED_TO_POOL: "Devolvió una solicitud al mapa",
  REQUEST_CANCELLED_BY_ADMIN: "Canceló una solicitud",
};

// Rojo para lo que quita accesos, ambar para lo que llama la atencion.
const ACTION_STYLES: Record<string, string> = {
  ADMIN_PROMOTED: "bg-amber-100 text-amber-800",
  VOLUNTEER_VERIFIED: "bg-emerald-100 text-emerald-800",
  VOLUNTEER_REJECTED: "bg-red-100 text-red-800",
  VOLUNTEER_DEACTIVATED: "bg-red-100 text-red-800",
  VOLUNTEER_REACTIVATED: "bg-emerald-100 text-emerald-800",
  USER_SUSPENDED: "bg-red-100 text-red-800",
  USER_REACTIVATED: "bg-emerald-100 text-emerald-800",
  REQUEST_RETURNED_TO_POOL: "bg-brand-100 text-brand-800",
  REQUEST_CANCELLED_BY_ADMIN: "bg-sand-200 text-sand-700",
};

export default function AdminAuditPage() {
  const isAdmin = useRequireAdminRole();
  const { data: logs, isLoading, isError } = useAuditLogs();

  if (!isAdmin) {
    return <Spinner label="Verificando permisos..." />;
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Bitácora
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Últimas 100 acciones administrativas. Queda registro de quién hizo
          qué y cuándo.
        </p>

        {isLoading && <Spinner label="Cargando bitácora..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar la bitácora.
          </p>
        )}

        {logs && logs.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-sand-600">
              Todavía no hay acciones registradas.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {logs?.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    ACTION_STYLES[log.action] ?? "bg-sand-100 text-sand-700"
                  }`}
                >
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
                <span className="text-xs text-sand-500">
                  {new Date(log.timestamp).toLocaleString("es-CO")}
                </span>
              </div>

              <p className="mt-2 text-sm text-sand-600">
                Por {log.actor_phone ?? log.actor_id}
                {log.prior_state && log.new_state
                  ? ` · ${log.prior_state} → ${log.new_state}`
                  : ""}
              </p>

              {log.notes && (
                <p className="mt-2 rounded-lg bg-sand-100 p-2 text-sm text-sand-700">
                  {log.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
