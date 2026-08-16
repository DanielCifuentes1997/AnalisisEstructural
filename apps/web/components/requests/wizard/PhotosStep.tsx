"use client";

import { Button } from "../../ui/Button";

interface PhotosStepProps {
  onNext: () => void;
  onBack: () => void;
}

// Deshabilitado a proposito: todavia no existe el endpoint de subida de
// fotos (presigned URLs hacia almacenamiento de objetos). Se deja el
// paso visible en el flujo para no reordenar el wizard cuando se
// construya, pero sin funcionalidad real todavia.
export function PhotosStep({ onNext, onBack }: PhotosStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        La subida de fotos estara disponible pronto. Por ahora puedes
        continuar sin adjuntar imagenes.
      </p>

      <div className="flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400">
        Proximamente
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onNext}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
