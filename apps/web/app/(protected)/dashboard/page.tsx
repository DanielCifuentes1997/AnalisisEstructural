"use client";

import Link from "next/link";
import { AppHeader } from "../../../components/ui/AppHeader";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { RequestList } from "../../../components/requests/RequestList";
import { useMyRequests } from "../../../lib/hooks/use-requests";

export default function DashboardPage() {
  const { data: requests, isLoading, isError } = useMyRequests();
  const hasRequests = requests && requests.length > 0;

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader subtitle="Panel de afectado" homeHref="/dashboard" />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-sand-900">
            Mis solicitudes
          </h1>
          <p className="mt-1 text-sm text-sand-600">
            Aquí ves el estado de cada vivienda que has reportado.
          </p>
        </div>

        <Link href="/requests/new">
          <span className="mb-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-brand-700 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-800">
            + Reportar una vivienda
          </span>
        </Link>

        {isLoading && <Spinner label="Cargando tus solicitudes..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar tus solicitudes. Intenta de nuevo.
          </p>
        )}

        {requests && !hasRequests && (
          <Card className="text-center">
            <p className="text-3xl" aria-hidden>
              🏠
            </p>
            <p className="mt-3 font-medium text-sand-900">
              Todavía no has reportado ninguna vivienda
            </p>
            <p className="mt-1 text-sm text-sand-600">
              Cuando lo hagas, un analista voluntario podrá acompañarte.
            </p>
          </Card>
        )}

        {hasRequests && <RequestList requests={requests} />}

        <Card className="mt-8 border-dashed bg-transparent shadow-none">
          <p className="text-sm font-medium text-sand-900">
            ¿Sabes de construcción?
          </p>
          <p className="mt-1 text-sm text-sand-600">
            Puedes registrarte también como analista voluntario y acompañar a
            tus vecinos.
          </p>
          <Link href="/volunteer/register">
            <span className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl border border-sand-300 bg-white px-5 text-sm font-medium text-sand-900 transition-colors hover:bg-sand-100">
              Registrarme como analista
            </span>
          </Link>
        </Card>
      </main>
    </div>
  );
}
