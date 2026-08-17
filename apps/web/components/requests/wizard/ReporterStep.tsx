"use client";

import { useAuthStore } from "../../../lib/auth-store";
import { Button } from "../../ui/Button";
import { TextInput } from "../../ui/TextInput";

interface ReporterStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ReporterStep({ value, onChange, onNext, onBack }: ReporterStepProps) {
  const phoneNumber = useAuthStore((state) => state.user?.phone_number);

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label="Nombre de la persona afectada"
        placeholder="Nombre completo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-sand-700">Telefono de contacto</span>
        <div className="min-h-12 rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-base text-sand-700">
          {phoneNumber}
        </div>
        <p className="text-xs text-sand-500">
          Este es el telefono con el que iniciaste sesion.
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Atras
        </Button>
        <Button type="button" onClick={onNext} disabled={value.trim().length < 2}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
