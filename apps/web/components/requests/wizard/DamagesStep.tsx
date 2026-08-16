"use client";

import { Button } from "../../ui/Button";

export interface DamagesValue {
  grietas_visibles: boolean;
  inclinacion: boolean;
  colapso_parcial: boolean;
  notas: string;
}

interface DamagesStepProps {
  value: DamagesValue;
  onChange: (value: DamagesValue) => void;
  onNext: () => void;
  onBack: () => void;
}

const CHECKBOX_OPTIONS: {
  key: keyof Pick<DamagesValue, "grietas_visibles" | "inclinacion" | "colapso_parcial">;
  label: string;
}[] = [
  { key: "grietas_visibles", label: "Grietas visibles en paredes o columnas" },
  { key: "inclinacion", label: "Inclinacion severa del piso o paredes" },
  { key: "colapso_parcial", label: "Colapso parcial de alguna zona" },
];

export function DamagesStep({ value, onChange, onNext, onBack }: DamagesStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Cuentanos que notas en tu vivienda (marca lo que aplique).
      </p>

      {CHECKBOX_OPTIONS.map(({ key, label }) => (
        <label key={key} className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          <span className="text-base text-gray-900">{label}</span>
        </label>
      ))}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Otros detalles (opcional)
        </label>
        <textarea
          className="min-h-24 rounded-lg border border-gray-300 px-4 py-3 text-base"
          value={value.notas}
          onChange={(e) => onChange({ ...value, notas: e.target.value })}
        />
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
