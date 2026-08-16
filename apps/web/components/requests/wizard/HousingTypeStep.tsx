"use client";

import type { HousingType } from "@proyecto/shared-types";
import { Button } from "../../ui/Button";

const OPTIONS: { value: HousingType; label: string }[] = [
  { value: "CASA", label: "Casa" },
  { value: "APARTAMENTO", label: "Apartamento" },
];

interface HousingTypeStepProps {
  value: HousingType | null;
  onChange: (value: HousingType) => void;
  onNext: () => void;
  onBack: () => void;
}

export function HousingTypeStep({
  value,
  onChange,
  onNext,
  onBack,
}: HousingTypeStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">¿Que tipo de vivienda es?</p>

      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-24 rounded-lg border-2 text-base font-medium transition-colors ${
              value === option.value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onNext} disabled={!value}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
