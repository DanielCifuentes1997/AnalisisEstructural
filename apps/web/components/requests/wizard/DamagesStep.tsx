"use client";

import { DAMAGE_OPTIONS } from "../../../lib/damage-labels";
import { Button } from "../../ui/Button";

export interface DamagesValue {
  selected: string[];
  otros_detalle: string;
  description: string;
}

interface DamagesStepProps {
  value: DamagesValue;
  onChange: (value: DamagesValue) => void;
  onNext: () => void;
  onBack: () => void;
}

const OTROS_KEY = "otros";
const CHECKBOX_OPTIONS = DAMAGE_OPTIONS.filter((o) => o.key !== OTROS_KEY);

export function DamagesStep({ value, onChange, onNext, onBack }: DamagesStepProps) {
  const toggle = (key: string) => {
    const selected = value.selected.includes(key)
      ? value.selected.filter((k) => k !== key)
      : [...value.selected, key];
    onChange({ ...value, selected });
  };

  const showOtrosDetalle = value.selected.includes(OTROS_KEY);
  const canContinue = value.description.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-sand-600">
        Cuentanos que notas en tu vivienda (marca lo que aplique).
      </p>

      {CHECKBOX_OPTIONS.map(({ key, label }) => (
        <label key={key} className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={value.selected.includes(key)}
            onChange={() => toggle(key)}
          />
          <span className="text-base text-sand-900">{label}</span>
        </label>
      ))}

      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={showOtrosDetalle}
          onChange={() => toggle(OTROS_KEY)}
        />
        <span className="text-base text-sand-900">Otros</span>
      </label>

      {showOtrosDetalle && (
        <textarea
          className="min-h-16 rounded-lg border border-sand-300 px-4 py-3 text-base"
          placeholder="Cuentanos que mas notas"
          value={value.otros_detalle}
          onChange={(e) => onChange({ ...value, otros_detalle: e.target.value })}
        />
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-sand-700">
          Describe el problema con tus palabras
        </label>
        <textarea
          className="min-h-24 rounded-lg border border-sand-300 px-4 py-3 text-base"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>

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
