"use client";

import Link from "next/link";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { RequestList } from "../../../components/requests/RequestList";
import { useMyRequests } from "../../../lib/hooks/use-requests";
import { useAuthStore } from "../../../lib/auth-store";

export default function DashboardPage() {
  const { data: requests, isLoading, isError } = useMyRequests();
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Mis solicitudes</h1>
        <button
          onClick={clearSession}
          className="min-h-12 text-sm text-gray-500 underline"
        >
          Cerrar sesion
        </button>
      </div>

      <Link href="/requests/new">
        <Button className="mb-3 w-full">Reportar una vivienda</Button>
      </Link>
      <Link href="/volunteer/register">
        <Button variant="secondary" className="mb-6 w-full">
          ¿Tienes criterio tecnico? Registrate como voluntario
        </Button>
      </Link>

      {isLoading && <Spinner label="Cargando tus solicitudes..." />}
      {isError && (
        <p className="text-center text-red-600">
          No pudimos cargar tus solicitudes. Intenta de nuevo.
        </p>
      )}
      {requests && <RequestList requests={requests} />}
    </main>
  );
}
