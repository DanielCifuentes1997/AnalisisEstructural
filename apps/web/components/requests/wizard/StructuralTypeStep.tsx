"use client";

import { Button } from "../../ui/Button";
import { TextInput } from "../../ui/TextInput";

const COMMON_TYPES = [
  "Mamposteria confinada",
  "Portico en concreto",
  "Portico en acero",
  "Bahareque",
  "Otro",
];

interface StructuralTypeStepProps {
  structuralType: string;
  floors: number | null;
  onChangeStructuralType: (value: string) => void;
  onChangeFloors: (value: number | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StructuralTypeStep({
  structuralType,
  floors,
  onChangeStructuralType,
  onChangeFloors,
  onNext,
  onBack,
}: StructuralTypeStepProps) {
  const canContinue = structuralType.trim().length > 0 && Boolean(floors);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Tipo de vivienda
        </label>
        <select
          className="min-h-12 rounded-lg border border-gray-300 px-4 text-base"
          value={structuralType}
          onChange={(e) => onChangeStructuralType(e.target.value)}
        >
          <option value="">Selecciona una opcion</option>
          {COMMON_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <TextInput
        label="Numero de pisos"
        type="number"
        min={1}
        max={100}
        value={floors ?? ""}
        onChange={(e) =>
          onChangeFloors(e.target.value ? Number(e.target.value) : null)
        }
      />

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
