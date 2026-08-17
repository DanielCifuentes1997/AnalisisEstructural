"use client";

import type { HousingType } from "@proyecto/shared-types";
import { damageLabel } from "../../../lib/damage-labels";
import { Button } from "../../ui/Button";
import type { AddressValue } from "./AddressStep";
import type { DamagesValue } from "./DamagesStep";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

interface ReviewStepProps {
  address: AddressValue;
  addressComplement: string;
  reporterName: string;
  housingType: HousingType | null;
  damages: DamagesValue;
  photoUrls: string[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function ReviewStep({
  address,
  addressComplement,
  reporterName,
  housingType,
  damages,
  photoUrls,
  onSubmit,
  onBack,
  isSubmitting,
  errorMessage,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-sand-600">Revisa antes de enviar:</p>

      <dl className="flex flex-col gap-2 rounded-lg bg-sand-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-sand-500">Direccion</dt>
          <dd className="text-right text-sand-900">
            {[address.street, address.city, address.department].filter(Boolean).join(", ")}
          </dd>
        </div>
        {addressComplement && (
          <div className="flex justify-between gap-4">
            <dt className="text-sand-500">Complemento</dt>
            <dd className="text-right text-sand-900">{addressComplement}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-sand-500">Nombre</dt>
          <dd className="text-sand-900">{reporterName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sand-500">Tipo</dt>
          <dd className="text-sand-900">
            {housingType ? HOUSING_TYPE_LABELS[housingType] : "-"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sand-500">Daños reportados</dt>
          <dd className="text-right text-sand-900">
            {damages.selected.length > 0
              ? damages.selected.map(damageLabel).join(", ")
              : "Ninguno marcado"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sand-500">Descripcion</dt>
          <dd className="text-sand-900">{damages.description}</dd>
        </div>
        {photoUrls.length > 0 && (
          <div className="flex flex-col gap-1">
            <dt className="text-sand-500">Fotos ({photoUrls.length})</dt>
            <dd className="grid grid-cols-4 gap-2">
              {photoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage
                <img
                  key={url}
                  src={url}
                  alt="Foto del daño"
                  className="h-14 w-full rounded object-cover"
                />
              ))}
            </dd>
          </div>
        )}
      </dl>

      <p className="text-sm text-sand-500">
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
