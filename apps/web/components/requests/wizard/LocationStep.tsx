"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { TextInput } from "../../ui/TextInput";

export interface LocationValue {
  latitude: number | null;
  longitude: number | null;
}

interface LocationStepProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  onNext: () => void;
}

// No hay integracion de Mapbox todavia (NEXT_PUBLIC_MAPBOX_TOKEN esta
// vacio) - se usa la Geolocation API del navegador como via principal,
// con entrada manual de respaldo si el permiso falla o el usuario
// prefiere ingresarla a mano.
export function LocationStep({ value, onChange, onNext }: LocationStepProps) {
  const [geoError, setGeoError] = useState<string>();
  const [isLocating, setIsLocating] = useState(false);

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no soporta geolocalizacion");
      return;
    }

    setIsLocating(true);
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setGeoError(
          "No pudimos obtener tu ubicacion. Ingresala manualmente abajo.",
        );
        setIsLocating(false);
      },
    );
  };

  const canContinue = value.latitude !== null && value.longitude !== null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Necesitamos la ubicacion de la vivienda que quieres reportar.
      </p>

      <Button
        type="button"
        variant="secondary"
        onClick={useCurrentLocation}
        isLoading={isLocating}
      >
        Usar mi ubicacion actual
      </Button>

      {geoError && <p className="text-sm text-red-600">{geoError}</p>}

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Latitud"
          type="number"
          step="any"
          value={value.latitude ?? ""}
          onChange={(e) =>
            onChange({ ...value, latitude: e.target.value ? Number(e.target.value) : null })
          }
        />
        <TextInput
          label="Longitud"
          type="number"
          step="any"
          value={value.longitude ?? ""}
          onChange={(e) =>
            onChange({ ...value, longitude: e.target.value ? Number(e.target.value) : null })
          }
        />
      </div>

      <Button type="button" onClick={onNext} disabled={!canContinue}>
        Continuar
      </Button>
    </div>
  );
}
