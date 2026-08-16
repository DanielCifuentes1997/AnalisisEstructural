"use client";

import { useState } from "react";
import { geocodeAddress } from "../../../lib/geocoding";
import { Button } from "../../ui/Button";
import { TextInput } from "../../ui/TextInput";
import { AddressMapPicker } from "./AddressMapPicker";

export interface AddressValue {
  street: string;
  city: string;
  department: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressStepProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  onNext: () => void;
}

export function AddressStep({ value, onChange, onNext }: AddressStepProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();

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

  const canContinue = value.latitude !== null && value.longitude !== null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
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
      <p className="text-xs text-gray-500">
        Si el punto no queda exacto, puedes arrastrar el marcador o tocar el
        mapa para corregirlo.
      </p>

      <Button type="button" onClick={onNext} disabled={!canContinue}>
        Continuar
      </Button>
    </div>
  );
}
