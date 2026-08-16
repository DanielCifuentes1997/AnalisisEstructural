"use client";

import type { HousingType } from "@proyecto/shared-types";
import { Button } from "../ui/Button";
import type { HeatmapItem } from "../../lib/types";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

interface RequestSidePanelProps {
  item: HeatmapItem | null;
  onAccept: () => void;
  isAccepting: boolean;
  errorMessage?: string;
}

export function RequestSidePanel({
  item,
  onAccept,
  isAccepting,
  errorMessage,
}: RequestSidePanelProps) {
  if (!item) {
    return (
      <p className="p-4 text-sm text-gray-500">
        Toca un marcador del mapa para ver el detalle de una solicitud.
      </p>
    );
  }

  const createdAt = new Date(item.created_at).toLocaleString("es-CO");

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {HOUSING_TYPE_LABELS[item.housing_type]}
      </h2>
      <p className="text-sm text-gray-500">Reportada el {createdAt}</p>
      <p className="text-sm text-gray-500">
        La ubicación exacta se revela solo después de aceptar.
      </p>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button onClick={onAccept} isLoading={isAccepting}>
        Aceptar este caso
      </Button>
    </div>
  );
}
