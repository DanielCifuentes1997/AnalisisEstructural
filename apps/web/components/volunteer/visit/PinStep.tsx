"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { TextInput } from "../../ui/TextInput";

interface PinStepProps {
  onSubmit: (pin: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function PinStep({ onSubmit, isLoading, errorMessage }: PinStepProps) {
  const [pin, setPin] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(pin);
  };

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Pide el codigo al ciudadano
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        El ciudadano tiene un codigo de 6 digitos en su pantalla. Pidele que
        te lo dicte para confirmar tu presencia.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Codigo (PIN)"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          error={errorMessage}
          autoFocus
        />
        <Button type="submit" isLoading={isLoading}>
          Verificar codigo
        </Button>
      </form>
    </Card>
  );
}
