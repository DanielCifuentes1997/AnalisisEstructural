"use client";

import { useState } from "react";
import type { HousingType } from "@proyecto/shared-types";
import { geocodeAddress } from "../../../lib/geocoding";
import { Button } from "../../ui/Button";
import { TextInput } from "../../ui/TextInput";
import { AddressMapPicker } from "./AddressMapPicker";

export interface AddressValue {
  street: string;
  city: string;
  department: string;
  // Casa: complemento libre. Apartamento: torre/bloque + numero de apto.
  complement: string;
  tower: string;
  apartment: string;
  latitude: number | null;
  longitude: number | null;
}

// Compone el complemento en una sola linea legible para el analista.
export function buildAddressComplement(
  value: AddressValue,
  housingType: HousingType | null,
): string {
  if (housingType === "APARTAMENTO") {
    return [
      value.tower.trim() && `Torre/Bloque ${value.tower.trim()}`,
      value.apartment.trim() && `Apto ${value.apartment.trim()}`,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return value.complement.trim();
}

interface AddressStepProps {
  value: AddressValue;
  housingType: HousingType | null;
  onChange: (value: AddressValue) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({
  value,
  housingType,
  onChange,
  onNext,
  onBack,
}: AddressStepProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();

  const isApartment = housingType === "APARTAMENTO";

  const handleSearch = async () => {
    const query = [value.street, value.city, value.department]
      .filter(Boolean)
      .join(", ");
    if (!query) {
      setSearchError("Escribe al menos la direccion");
      return;
    }

    setIsSearching(true);
    setSearchError(undefined);
    const result = await geocodeAddress(query);
    setIsSearching(false);

    if (!result) {
      setSearchError(
        "No pudimos encontrar esa direccion. Puedes tocar el mapa para marcar el punto manualmente.",
      );
      return;
    }

    onChange({ ...value, latitude: result.latitude, longitude: result.longitude });
  };

  const hasPoint = value.latitude !== null && value.longitude !== null;
  // En un edificio el punto no basta: sin el apartamento el analista
  // llega a la porteria y no sabe a que puerta tocar.
  const canContinue = hasPoint && (!isApartment || value.apartment.trim() !== "");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-sand-600">
        Escribe la direccion de la vivienda que quieres reportar.
      </p>

      <TextInput
        label="Direccion (calle/carrera)"
        placeholder="Ej. Cra 18 #4a-64"
        value={value.street}
        onChange={(e) => onChange({ ...value, street: e.target.value })}
      />
      <TextInput
        label="Ciudad"
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
      />
      <TextInput
        label="Departamento"
        value={value.department}
        onChange={(e) => onChange({ ...value, department: e.target.value })}
      />

      {isApartment ? (
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Torre o bloque"
            placeholder="Ej. 4"
            hint="Opcional"
            value={value.tower}
            onChange={(e) => onChange({ ...value, tower: e.target.value })}
          />
          <TextInput
            label="Apartamento"
            placeholder="Ej. 502"
            value={value.apartment}
            onChange={(e) => onChange({ ...value, apartment: e.target.value })}
          />
        </div>
      ) : (
        <TextInput
          label="Complemento"
          placeholder="Ej. Conjunto Los Cerros, casa 12"
          hint="Opcional: algo que ayude a encontrar la casa"
          value={value.complement}
          onChange={(e) => onChange({ ...value, complement: e.target.value })}
        />
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={handleSearch}
        isLoading={isSearching}
      >
        Buscar en el mapa
      </Button>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      <AddressMapPicker
        center={
          value.latitude !== null && value.longitude !== null
            ? { latitude: value.latitude, longitude: value.longitude }
            : null
        }
        onChange={({ latitude, longitude }) =>
          onChange({ ...value, latitude, longitude })
        }
      />
      <p className="text-xs text-sand-500">
        Si el punto no queda exacto, puedes arrastrar el marcador o tocar el
        mapa para corregirlo.
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
