"use client";

import { Button } from "../../ui/Button";
import type { DamagesValue } from "./DamagesStep";
import type { LocationValue } from "./LocationStep";

interface ReviewStepProps {
  location: LocationValue;
  structuralType: string;
  floors: number | null;
  damages: DamagesValue;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function ReviewStep({
  location,
  structuralType,
  floors,
  damages,
  onSubmit,
  onBack,
  isSubmitting,
  errorMessage,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">Revisa antes de enviar:</p>

      <dl className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Ubicacion</dt>
          <dd className="text-gray-900">
            {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Tipo</dt>
          <dd className="text-gray-900">{structuralType}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Pisos</dt>
          <dd className="text-gray-900">{floors}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Daños reportados</dt>
          <dd className="text-gray-900">
            {[
              damages.grietas_visibles && "Grietas",
              damages.inclinacion && "Inclinacion",
              damages.colapso_parcial && "Colapso parcial",
            ]
              .filter(Boolean)
              .join(", ") || "Ninguno marcado"}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-gray-500">
        Un voluntario con criterio tecnico revisara tu reporte y te
        contactara para dar acompañamiento informal mientras llega la
        autoridad competente. Esto no es una inspeccion oficial.
      </p>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onSubmit} isLoading={isSubmitting}>
          Enviar reporte
        </Button>
      </div>
    </div>
  );
}
