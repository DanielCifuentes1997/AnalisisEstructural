import type { RequestState } from "@proyecto/shared-types";

const STATE_LABELS: Record<RequestState, string> = {
  REQUESTED: "Registrada",
  WAITING_VOLUNTEER: "Esperando voluntario",
  ASSIGNED: "Voluntario asignado",
  SCHEDULED: "Visita programada",
  IN_PROGRESS: "Voluntario en camino",
  VERIFICATION_PENDING: "Verificando llegada",
  NOTE_PENDING: "Registrando visita",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  REASSIGNMENT_REQUIRED: "Buscando otro voluntario",
};

const STATE_STYLES: Record<RequestState, string> = {
  REQUESTED: "bg-gray-100 text-gray-700",
  WAITING_VOLUNTEER: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  VERIFICATION_PENDING: "bg-blue-100 text-blue-800",
  NOTE_PENDING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REASSIGNMENT_REQUIRED: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ state }: { state: RequestState }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATE_STYLES[state]}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
