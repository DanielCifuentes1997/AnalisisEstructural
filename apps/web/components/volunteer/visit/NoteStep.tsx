"use client";

import { useState } from "react";
import type { ZoneStatus } from "@proyecto/shared-types";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { TextInput } from "../../ui/TextInput";

interface ZoneEntry {
  zone_name: string;
  status: ZoneStatus;
  comment: string;
}

interface NoteStepProps {
  onSubmit: (zones: ZoneEntry[], generalComments: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

const STATUS_LABELS: Record<ZoneStatus, string> = {
  SAFE: "Segura",
  CAUTION: "Precaucion",
  DANGEROUS: "Peligrosa",
};

function emptyZone(): ZoneEntry {
  return { zone_name: "", status: "SAFE", comment: "" };
}

export function NoteStep({ onSubmit, isLoading, errorMessage }: NoteStepProps) {
  const [zones, setZones] = useState<ZoneEntry[]>([emptyZone()]);
  const [generalComments, setGeneralComments] = useState("");
  const [validationError, setValidationError] = useState<string>();

  const updateZone = (index: number, patch: Partial<ZoneEntry>) => {
    setZones((prev) =>
      prev.map((zone, i) => (i === index ? { ...zone, ...patch } : zone)),
    );
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (zones.some((z) => z.zone_name.trim().length === 0)) {
      setValidationError("Cada zona necesita un nombre (ej. Cocina)");
      return;
    }

    setValidationError(undefined);
    onSubmit(zones, generalComments);
  };

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Nota de la visita
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Registra lo que observaste por zona o habitacion. Esto no es un
        dictamen oficial, es acompañamiento informal para el ciudadano.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {zones.map((zone, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextInput
                  label="Zona / habitacion"
                  placeholder="Ej. Cocina"
                  value={zone.zone_name}
                  onChange={(e) => updateZone(index, { zone_name: e.target.value })}
                />
              </div>
              {zones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeZone(index)}
                  className="min-h-12 min-w-12 text-sm text-red-600"
                  aria-label="Quitar zona"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <select
                className="min-h-12 rounded-lg border border-gray-300 px-4 text-base"
                value={zone.status}
                onChange={(e) =>
                  updateZone(index, { status: e.target.value as ZoneStatus })
                }
              >
                {(Object.keys(STATUS_LABELS) as ZoneStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <TextInput
              label="Comentario (opcional)"
              value={zone.comment}
              onChange={(e) => updateZone(index, { comment: e.target.value })}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => setZones((prev) => [...prev, emptyZone()])}
          className="min-h-12 text-sm text-blue-600 underline"
        >
          + Agregar otra zona
        </button>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Comentarios generales (opcional)
          </label>
          <textarea
            className="min-h-24 rounded-lg border border-gray-300 px-4 py-3 text-base"
            value={generalComments}
            onChange={(e) => setGeneralComments(e.target.value)}
          />
        </div>

        {(validationError ?? errorMessage) && (
          <p className="text-sm text-red-600">{validationError ?? errorMessage}</p>
        )}

        <Button type="submit" isLoading={isLoading}>
          Enviar nota de visita
        </Button>
      </form>
    </Card>
  );
}
