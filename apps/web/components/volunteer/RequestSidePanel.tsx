"use client";

import type { HousingType } from "@proyecto/shared-types";
import { Button } from "../ui/Button";
import { damageLabel } from "../../lib/damage-labels";
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
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-3xl" aria-hidden>
          📍
        </span>
        <p className="text-sm text-sand-500">
          Toca un punto del mapa para ver qué daños reportaron y decidir si
          tomas el caso.
        </p>
      </div>
    );
  }

  const createdAt = new Date(item.created_at).toLocaleString("es-CO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const damages = item.damages_json;
  const photos = damages.photo_urls ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-sand-900">
          {HOUSING_TYPE_LABELS[item.housing_type]}
        </h2>
        <p className="text-sm text-sand-500">Reportada el {createdAt}</p>
      </div>

      {photos.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">
            Fotos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir la foto en grande"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage */}
                <img
                  src={url}
                  alt="Daño reportado"
                  className="h-28 w-full rounded-xl border border-sand-200 object-cover transition-opacity hover:opacity-80"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {damages.selected.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">
            Qué reportaron
          </h3>
          <ul className="flex flex-col gap-1.5">
            {damages.selected.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 text-sm text-sand-900"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {damageLabel(key)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {damages.otros_detalle && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-sand-500">
            Otros daños
          </h3>
          <p className="text-sm text-sand-700">{damages.otros_detalle}</p>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-sand-500">
          En sus palabras
        </h3>
        <p className="rounded-xl bg-sand-100 p-3 text-sm leading-relaxed text-sand-900">
          {damages.description}
        </p>
      </div>

      <div className="border-t border-sand-200 pt-4">
        <p className="mb-3 text-xs leading-relaxed text-sand-500">
          El punto del mapa es la ubicación real. La dirección exacta, el
          nombre y el teléfono se te muestran cuando aceptes el caso.
        </p>
        {errorMessage && (
          <p className="mb-3 text-sm text-red-600">{errorMessage}</p>
        )}
        <Button onClick={onAccept} isLoading={isAccepting} className="w-full">
          Aceptar este caso
        </Button>
      </div>
    </div>
  );
}
