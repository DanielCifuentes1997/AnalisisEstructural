"use client";

import Link from "next/link";
import { AppHeader } from "../../../components/ui/AppHeader";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { PushPrompt } from "../../../components/push/PushPrompt";
import { VOLUNTEER_NAV } from "../../../components/volunteer/nav";
import { useRequireVolunteerRole } from "../../../lib/hooks/use-require-volunteer-role";
import { useMyVisits } from "../../../lib/hooks/use-visit";

const CLOSED_STATES = ["COMPLETED", "CANCELLED"];

export default function VolunteerHomePage() {
  const isVolunteer = useRequireVolunteerRole();
  const { data: visits, isLoading, isError } = useMyVisits();

  if (!isVolunteer) {
    return <Spinner label="Verificando tu perfil..." />;
  }

  const active = visits?.filter((v) => !CLOSED_STATES.includes(v.state)) ?? [];
  const closed = visits?.filter((v) => CLOSED_STATES.includes(v.state)) ?? [];

  return (
    <div className="min-h-screen bg-sand-50">
      <AppHeader
        subtitle="Panel de analista"
        homeHref="/volunteer"
        nav={VOLUNTEER_NAV}
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-sand-900">
            Mis visitas
          </h1>
          <p className="mt-1 text-sm text-sand-600">
            Los casos que has aceptado. Puedes volver a ellos cuando quieras.
          </p>
        </div>

        <PushPrompt role="VOLUNTEER" />

        <Link href="/volunteer/map">
          <span className="mb-6 flex min-h-14 w-full items-center justify-center rounded-xl bg-brand-700 px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-800">
            Ver mapa de solicitudes
          </span>
        </Link>

        {isLoading && <Spinner label="Cargando tus visitas..." />}
        {isError && (
          <p className="text-center text-red-600">
            No pudimos cargar tus visitas.
          </p>
        )}

        {visits && visits.length === 0 && (
          <Card className="text-center">
            <p className="text-3xl" aria-hidden>
              🗺️
            </p>
            <p className="mt-3 font-medium text-sand-900">
              Todavía no has aceptado ningún caso
            </p>
            <p className="mt-1 text-sm text-sand-600">
              Abre el mapa para ver las solicitudes cerca de ti.
            </p>
          </Card>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sand-500">
              En curso
            </h2>
            <div className="flex flex-col gap-3">
              {active.map((visit) => (
                <VisitCard key={visit.visit_id} visit={visit} />
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sand-500">
              Finalizadas
            </h2>
            <div className="flex flex-col gap-3">
              {closed.map((visit) => (
                <VisitCard key={visit.visit_id} visit={visit} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function VisitCard({
  visit,
}: {
  visit: {
    visit_id: string;
    reporter_name: string;
    address_text: string;
    address_complement: string | null;
    created_at: string;
    state: React.ComponentProps<typeof StatusBadge>["state"];
  };
}) {
  return (
    <Link href={`/volunteer/visits/${visit.visit_id}`}>
      <Card className="flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
        <div className="min-w-0">
          <p className="truncate font-medium text-sand-900">
            {visit.reporter_name}
          </p>
          <p className="truncate text-sm text-sand-600">
            {visit.address_text}
            {visit.address_complement ? ` — ${visit.address_complement}` : ""}
          </p>
          <p className="mt-1 text-xs text-sand-500">
            Aceptada el {new Date(visit.created_at).toLocaleDateString("es-CO")}
          </p>
        </div>
        <StatusBadge state={visit.state} />
      </Card>
    </Link>
  );
}
