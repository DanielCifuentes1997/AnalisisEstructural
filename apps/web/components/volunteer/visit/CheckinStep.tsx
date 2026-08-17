"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";

interface CheckinStepProps {
  onCheckin: (latitude: number, longitude: number) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function CheckinStep({ onCheckin, isLoading, errorMessage }: CheckinStepProps) {
  const [geoError, setGeoError] = useState<string>();
  const [isLocating, setIsLocating] = useState(false);

  const handleArrival = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no soporta geolocalizacion");
      return;
    }

    setIsLocating(true);
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onCheckin(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setIsLocating(false);
        setGeoError("No pudimos obtener tu ubicacion. Activa el GPS e intenta de nuevo.");
      },
      { enableHighAccuracy: true },
    );
  };

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-sand-900">
        Llegaste al sitio?
      </h2>
      <p className="mb-4 text-sm text-sand-600">
        Debes estar a menos de 100 metros de la vivienda para continuar.
        Presiona el boton cuando estes en la puerta.
      </p>
      {(geoError ?? errorMessage) && (
        <p className="mb-3 text-sm text-red-600">{geoError ?? errorMessage}</p>
      )}
      <Button onClick={handleArrival} isLoading={isLocating || isLoading}>
        Llegue al sitio
      </Button>
    </Card>
  );
}
