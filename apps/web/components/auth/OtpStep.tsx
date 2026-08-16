"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";

interface OtpStepProps {
  phoneE164: string;
  onSubmit: (code: string) => void;
  onBack: () => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function OtpStep({
  phoneE164,
  onSubmit,
  onBack,
  isLoading,
  errorMessage,
}: OtpStepProps) {
  const [code, setCode] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Enviamos un codigo a <strong>{phoneE164}</strong>
      </p>
      <TextInput
        label="Codigo de verificacion"
        type="text"
        inputMode="numeric"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={errorMessage}
        autoFocus
      />
      <Button type="submit" isLoading={isLoading}>
        Verificar
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="min-h-12 text-sm text-gray-500 underline"
      >
        Cambiar numero
      </button>
    </form>
  );
}
