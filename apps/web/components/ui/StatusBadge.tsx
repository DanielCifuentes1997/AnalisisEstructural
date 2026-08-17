import type { RequestState } from "@proyecto/shared-types";

const STATE_LABELS: Record<RequestState, string> = {
  REQUESTED: "Registrada",
  WAITING_VOLUNTEER: "Buscando analista",
  ASSIGNED: "Analista asignado",
  SCHEDULED: "Visita programada",
  IN_PROGRESS: "Analista en camino",
  VERIFICATION_PENDING: "Confirma con tu PIN",
  NOTE_PENDING: "Registrando la visita",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  REASSIGNMENT_REQUIRED: "Buscando otro analista",
};

const STATE_STYLES: Record<RequestState, string> = {
  REQUESTED: "bg-sand-100 text-sand-700",
  WAITING_VOLUNTEER: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-brand-100 text-brand-800",
  SCHEDULED: "bg-brand-100 text-brand-800",
  IN_PROGRESS: "bg-brand-100 text-brand-800",
  VERIFICATION_PENDING: "bg-amber-100 text-amber-800",
  NOTE_PENDING: "bg-brand-100 text-brand-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-sand-200 text-sand-600",
  REASSIGNMENT_REQUIRED: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ state }: { state: RequestState }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATE_STYLES[state]}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
