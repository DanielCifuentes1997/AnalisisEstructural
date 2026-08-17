"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ABUSE_REASON_LABELS } from "@proyecto/shared-types";
import { ADMIN_NAV } from "../../../../components/admin/nav";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Spinner } from "../../../../components/ui/Spinner";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { apiClient } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/auth-store";
import { useRequireAdminRole } from "../../../../lib/hooks/use-require-admin-role";

export default function AdminReportsPage() {
  const isAdmin = useRequireAdminRole();
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => apiClient.listAbuseReports(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const markReviewed = useMutation({
    mutationFn: (reportId: string) =>
      apiClient.reviewAbuseReport(accessToken as string, reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (!isAdmin) return <Spinner label="Verificando permisos..." />;

  const pending = reports?.filter((r) => !r.reviewed_at) ?? [];

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Administración" homeHref="/admin" nav={ADMIN_NAV} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-sand-900">
          Denuncias
        </h1>
        <p className="mb-6 text-sm text-sand-600">
          Reportes de ciudadanos sobre el comportamiento de un analista. No
          tienen que ver con los daños de las viviendas.
        </p>

        {pending.length > 0 && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <p className="font-medium text-red-900">
              {pending.length}{" "}
              {pending.length === 1
                ? "denuncia sin revisar"
                : "denuncias sin revisar"}
            </p>
            <p className="mt-1 text-sm text-red-800">
              Lee la conversación antes de decidir. Si hay riesgo, suspende la
              cuenta: sus casos vuelven al mapa automáticamente.
            </p>
          </Card>
        )}

        {isLoading && <Spinner label="Cargando denuncias..." />}

        {reports && reports.length === 0 && (
          <Card className="text-center">
            <p className="text-3xl" aria-hidden>
              ✅
            </p>
            <p className="mt-3 text-sm text-sand-600">
              No hay denuncias. Buena señal.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {reports?.map((report) => (
            <Card
              key={report.id}
              className={report.reviewed_at ? "opacity-60" : "border-red-200"}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sand-900">
                    {ABUSE_REASON_LABELS[report.reason]}
                  </p>
                  <p className="text-sm text-sand-600">
                    Contra <strong>{report.volunteer_name}</strong> · reportado
                    por {report.citizen_name}
                  </p>
                </div>
                <StatusBadge state={report.request_state} />
              </div>

              {report.details && (
                <p className="my-3 rounded-xl bg-sand-100 p-3 text-sm text-sand-800">
                  {report.details}
                </p>
              )}

              <p className="text-xs text-sand-500">
                {new Date(report.created_at).toLocaleString("es-CO")}
                {report.reviewed_at
                  ? ` · revisada el ${new Date(report.reviewed_at).toLocaleDateString("es-CO")}`
                  : ""}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-sand-100 pt-4">
                <Link href="/admin/conversaciones">
                  <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-sand-300 bg-white px-5 text-sm font-medium text-sand-900 transition-colors hover:bg-sand-100">
                    Leer la conversación
                  </span>
                </Link>
                <Link href="/admin/analistas?estado=PENDING">
                  <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-sand-300 bg-white px-5 text-sm font-medium text-sand-900 transition-colors hover:bg-sand-100">
                    Ver al analista
                  </span>
                </Link>
                {!report.reviewed_at && (
                  <Button
                    isLoading={markReviewed.isPending}
                    onClick={() => markReviewed.mutate(report.id)}
                  >
                    Marcar como revisada
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
