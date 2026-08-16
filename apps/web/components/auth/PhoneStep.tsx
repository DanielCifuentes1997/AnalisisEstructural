"use client";

import { useState } from "react";
import { phoneNumberSchema } from "@proyecto/shared-types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { toE164Colombia } from "../../lib/utils/phone";

interface PhoneStepProps {
  onSubmit: (phoneE164: string) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function PhoneStep({ onSubmit, isLoading, errorMessage }: PhoneStepProps) {
  const [rawPhone, setRawPhone] = useState("");
  const [validationError, setValidationError] = useState<string>();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const phoneE164 = toE164Colombia(rawPhone);
    const result = phoneNumberSchema.safeParse(phoneE164);

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Numero invalido");
      return;
    }

    setValidationError(undefined);
    onSubmit(phoneE164);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextInput
        label="Numero de celular"
        type="tel"
        placeholder="300 123 4567"
        value={rawPhone}
        onChange={(e) => setRawPhone(e.target.value)}
        error={validationError ?? errorMessage}
        autoFocus
      />
      <Button type="submit" isLoading={isLoading}>
        Enviar codigo
      </Button>
    </form>
  );
}
